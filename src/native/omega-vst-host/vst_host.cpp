#include <napi.h>
#include "vst2_types.h"
#include "ring_buffer.h"

#include <thread>
#include <atomic>
#include <vector>
#include <string>
#include <iostream>
#include <chrono>

#ifdef _WIN32
#include <windows.h>
#define VSTCALLBACK __cdecl
typedef AEffect* (VSTCALLBACK *PluginEntryProc)(audioMasterCallback audioMaster);
#else
// Stubs for cross-platform compilation
#define VSTCALLBACK
typedef void* HINSTANCE;
#endif

// Global Plugin Host State
struct PluginState {
    HINSTANCE libraryInstance = nullptr;
    AEffect* effect = nullptr;
    
    // SAB Audio & MIDI Queues
    float* inputSAB = nullptr;
    int32_t inputSABSize = 0;
    float* outputSAB = nullptr;
    int32_t outputSABSize = 0;
    int32_t* midiSAB = nullptr;
    int32_t midiSABCapacity = 0;
    
    // Audio Thread
    std::thread audioThread;
    std::atomic<bool> audioThreadRunning{false};
    int32_t sampleRate = 44100;
    int32_t blockSize = 512;
    
    // HWND of the editor window
    void* parentWindowHandle = nullptr;
} g_state;

// Default Audio Master Callback
intptr_t VSTCALLBACK HostAudioMasterCallback(AEffect* effect, int32_t opcode, int32_t index, intptr_t value, void* ptr, float opt) {
    switch (opcode) {
        case audioMasterVersion:
            return 2400; // VST 2.4
        default:
            break;
    }
    return 0;
}

// IPC Methods for Node.js
Napi::Value LoadPlugin(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected for dllPath").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    std::string path = info[0].As<Napi::String>().Utf8Value();
    
    // Unload existing plugin if loaded
    if (g_state.effect) {
        if (g_state.audioThreadRunning) {
            g_state.audioThreadRunning = false;
            if (g_state.audioThread.joinable()) {
                g_state.audioThread.join();
            }
        }
        g_state.effect->dispatcher(g_state.effect, effClose, 0, 0, nullptr, 0.0f);
        g_state.effect = nullptr;
    }
    
    #ifdef _WIN32
    if (g_state.libraryInstance) {
        FreeLibrary(g_state.libraryInstance);
        g_state.libraryInstance = nullptr;
    }
    
    // Convert path to wide string for Windows API
    std::wstring wpath(path.begin(), path.end());
    g_state.libraryInstance = LoadLibraryW(wpath.c_str());
    
    if (!g_state.libraryInstance) {
        Napi::Error::New(env, "Failed to load VST DLL library").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    PluginEntryProc mainProc = (PluginEntryProc)GetProcAddress(g_state.libraryInstance, "VSTPluginMain");
    if (!mainProc) {
        // Fallback for older VSTs
        mainProc = (PluginEntryProc)GetProcAddress(g_state.libraryInstance, "main");
    }
    
    if (!mainProc) {
        FreeLibrary(g_state.libraryInstance);
        g_state.libraryInstance = nullptr;
        Napi::Error::New(env, "Invalid VST DLL: VSTPluginMain entry point not found").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    g_state.effect = mainProc(HostAudioMasterCallback);
    if (!g_state.effect || g_state.effect->magic != kEffectMagic) {
        FreeLibrary(g_state.libraryInstance);
        g_state.libraryInstance = nullptr;
        g_state.effect = nullptr;
        Napi::Error::New(env, "VST initialization failed (magic mismatch)").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    // Initialize plugin
    g_state.effect->dispatcher(g_state.effect, effOpen, 0, 0, nullptr, 0.0f);
    
    // Assemble info object
    Napi::Object result = Napi::Object::New(env);
    
    char nameBuf[256] = {0};
    g_state.effect->dispatcher(g_state.effect, effGetEffectName, 0, 0, nameBuf, 0.0f);
    result.Set("name", Napi::String::New(env, nameBuf[0] ? nameBuf : "Unknown VST"));
    
    char vendorBuf[256] = {0};
    g_state.effect->dispatcher(g_state.effect, effGetVendorString, 0, 0, vendorBuf, 0.0f);
    result.Set("vendor", Napi::String::New(env, vendorBuf[0] ? vendorBuf : "Unknown Vendor"));
    
    result.Set("numParams", Napi::Number::New(env, g_state.effect->numParams));
    result.Set("numInputs", Napi::Number::New(env, g_state.effect->numInputs));
    result.Set("numOutputs", Napi::Number::New(env, g_state.effect->numOutputs));
    result.Set("uniqueId", Napi::Number::New(env, g_state.effect->uniqueID));
    
    bool hasEditor = (g_state.effect->flags & effFlagsHasEditor) != 0;
    result.Set("hasEditor", Napi::Boolean::New(env, hasEditor));
    
    return result;
    #else
    // Graceful fallback for macOS/Linux - reports that hosting is disabled
    Napi::Object result = Napi::Object::New(env);
    result.Set("name", Napi::String::New(env, "VST Hosting (Unsupported on this platform)"));
    result.Set("vendor", Napi::String::New(env, "None"));
    result.Set("numParams", Napi::Number::New(env, 0));
    result.Set("numInputs", Napi::Number::New(env, 0));
    result.Set("numOutputs", Napi::Number::New(env, 0));
    result.Set("uniqueId", Napi::Number::New(env, 0));
    result.Set("hasEditor", Napi::Boolean::New(env, false));
    return result;
    #endif
}

Napi::Value SetSharedBuffer(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 3 || !info[0].IsTypedArray() || !info[1].IsTypedArray() || !info[2].IsTypedArray()) {
        Napi::TypeError::New(env, "TypedArrays expected for input, output and midi buffers").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    Napi::Float32Array inputArr = info[0].As<Napi::Float32Array>();
    g_state.inputSAB = inputArr.Data();
    g_state.inputSABSize = inputArr.ElementLength();
    
    Napi::Float32Array outputArr = info[1].As<Napi::Float32Array>();
    g_state.outputSAB = outputArr.Data();
    g_state.outputSABSize = outputArr.ElementLength();
    
    Napi::Int32Array midiArr = info[2].As<Napi::Int32Array>();
    g_state.midiSAB = midiArr.Data();
    g_state.midiSABCapacity = midiArr.ElementLength() / 4; // Each event is 4 integers
    
    return env.Undefined();
}

// Background Audio Processing Thread
void AudioProcessLoop() {
    #ifdef _WIN32
    // Set thread priority to Pro Audio
    SetThreadPriority(GetCurrentThread(), THREAD_PRIORITY_TIME_CRITICAL);
    #endif
    
    AudioRingBuffer inputRing(g_state.inputSAB, g_state.inputSABSize);
    AudioRingBuffer outputRing(g_state.outputSAB, g_state.outputSABSize);
    MidiRingBuffer midiRing(g_state.midiSAB, g_state.midiSABCapacity);
    
    int32_t channels = 2; // Stereo
    int32_t framesToProcess = g_state.blockSize;
    int32_t samplesToProcess = framesToProcess * channels;
    
    std::vector<float> interleavedInput(samplesToProcess, 0.0f);
    std::vector<float> interleavedOutput(samplesToProcess, 0.0f);
    
    std::vector<float> leftInput(framesToProcess, 0.0f);
    std::vector<float> rightInput(framesToProcess, 0.0f);
    std::vector<float> leftOutput(framesToProcess, 0.0f);
    std::vector<float> rightOutput(framesToProcess, 0.0f);
    
    float* inputs[2] = { leftInput.data(), rightInput.data() };
    float* outputs[2] = { leftOutput.data(), rightOutput.data() };
    
    std::vector<int32_t> midiEventsBuffer(1024, 0);
    std::vector<VstMidiEvent> vstMidiEvents;
    
    while (g_state.audioThreadRunning.load(std::memory_order_relaxed)) {
        // Wait until enough input samples are available to process
        if (inputRing.getAvailableRead() < samplesToProcess) {
            // Yield or short sleep to avoid CPU spinning
            std::this_thread::sleep_for(std::chrono::microseconds(200));
            continue;
        }
        
        // 1. Read interleaved audio from input SAB
        inputRing.read(interleavedInput.data(), samplesToProcess);
        
        // 2. De-interleave into Left & Right channels
        for (int32_t i = 0; i < framesToProcess; ++i) {
            leftInput[i] = interleavedInput[i * 2 + 0];
            rightInput[i] = interleavedInput[i * 2 + 1];
        }
        
        // 3. Process MIDI Events if VST has synth capabilities
        vstMidiEvents.clear();
        int32_t midiEventsCount = midiRing.getAvailableRead();
        if (midiEventsCount > 0) {
            if (midiEventsCount > 256) midiEventsCount = 256;
            midiRing.readEvents(midiEventsBuffer.data(), midiEventsCount);
            
            for (int32_t i = 0; i < midiEventsCount; ++i) {
                VstMidiEvent ev;
                ev.type = 1; // kVstMidiType
                ev.byteSize = sizeof(VstMidiEvent);
                ev.deltaFrames = midiEventsBuffer[i * 4 + 0]; // Sample offset
                ev.flags = 0;
                ev.noteLength = 0;
                ev.noteOffset = 0;
                ev.midiData[0] = static_cast<char>(midiEventsBuffer[i * 4 + 1]); // Status
                ev.midiData[1] = static_cast<char>(midiEventsBuffer[i * 4 + 2]); // Data 1
                ev.midiData[2] = static_cast<char>(midiEventsBuffer[i * 4 + 3]); // Data 2
                ev.midiData[3] = 0;
                ev.detune = 0;
                ev.noteOffVelocity = 0;
                ev.reserved1 = 0;
                ev.reserved2 = 0;
                vstMidiEvents.push_back(ev);
            }
        }
        
        // Feed MIDI events to VST
        if (!vstMidiEvents.empty() && g_state.effect) {
            VstEvents eventsStruct;
            eventsStruct.numEvents = static_cast<int32_t>(vstMidiEvents.size());
            eventsStruct.reserved = 0;
            for (size_t i = 0; i < vstMidiEvents.size(); ++i) {
                eventsStruct.events[i] = &vstMidiEvents[i];
            }
            g_state.effect->dispatcher(g_state.effect, effProcessEvents, 0, 0, &eventsStruct, 0.0f);
        }
        
        // 4. Process VST
        if (g_state.effect) {
            g_state.effect->processReplacing(g_state.effect, inputs, outputs, framesToProcess);
        } else {
            // Bypass
            std::copy(leftInput.begin(), leftInput.end(), leftOutput.begin());
            std::copy(rightInput.begin(), rightInput.end(), rightOutput.begin());
        }
        
        // 5. Interleave Left & Right back into output buffer
        for (int32_t i = 0; i < framesToProcess; ++i) {
            interleavedOutput[i * 2 + 0] = leftOutput[i];
            interleavedOutput[i * 2 + 1] = rightOutput[i];
        }
        
        // 6. Write interleaved output to output SAB
        outputRing.write(interleavedOutput.data(), samplesToProcess);
    }
}

Napi::Value StartAudioThread(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() >= 2) {
        g_state.sampleRate = info[0].As<Napi::Number>().Int32Value();
        g_state.blockSize = info[1].As<Napi::Number>().Int32Value();
    }
    
    if (g_state.effect) {
        g_state.effect->dispatcher(g_state.effect, effSetSampleRate, 0, 0, nullptr, static_cast<float>(g_state.sampleRate));
        g_state.effect->dispatcher(g_state.effect, effSetBlockSize, 0, g_state.blockSize, nullptr, 0.0f);
        g_state.effect->dispatcher(g_state.effect, effMainsChanged, 0, 1, nullptr, 0.0f); // Resume / turn on
    }
    
    if (!g_state.audioThreadRunning) {
        g_state.audioThreadRunning = true;
        g_state.audioThread = std::thread(AudioProcessLoop);
    }
    
    return env.Undefined();
}

Napi::Value StopAudioThread(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (g_state.audioThreadRunning) {
        g_state.audioThreadRunning = false;
        if (g_state.audioThread.joinable()) {
            g_state.audioThread.join();
        }
    }
    
    if (g_state.effect) {
        g_state.effect->dispatcher(g_state.effect, effMainsChanged, 0, 0, nullptr, 0.0f); // Suspend / turn off
    }
    
    return env.Undefined();
}

Napi::Value GetParams(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    Napi::Array result = Napi::Array::New(env);
    
    if (!g_state.effect) return result;
    
    for (int32_t i = 0; i < g_state.effect->numParams; ++i) {
        Napi::Object param = Napi::Object::New(env);
        param.Set("index", Napi::Number::New(env, i));
        
        char nameBuf[256] = {0};
        g_state.effect->dispatcher(g_state.effect, effGetParamName, i, 0, nameBuf, 0.0f);
        param.Set("name", Napi::String::New(env, nameBuf[0] ? nameBuf : "Param " + std::to_string(i)));
        
        char dispBuf[256] = {0};
        g_state.effect->dispatcher(g_state.effect, effGetParamDisplay, i, 0, dispBuf, 0.0f);
        param.Set("display", Napi::String::New(env, dispBuf));
        
        char labelBuf[256] = {0};
        g_state.effect->dispatcher(g_state.effect, effGetParamLabel, i, 0, labelBuf, 0.0f);
        param.Set("label", Napi::String::New(env, labelBuf));
        
        float val = g_state.effect->getParameter(g_state.effect, i);
        param.Set("value", Napi::Number::New(env, val));
        
        result.Set(i, param);
    }
    
    return result;
}

Napi::Value SetParam(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber()) {
        Napi::TypeError::New(env, "Number expected for index and value").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    int32_t index = info[0].As<Napi::Number>().Int32Value();
    float value = info[1].As<Napi::Number>().FloatValue();
    
    if (g_state.effect && index >= 0 && index < g_state.effect->numParams) {
        g_state.effect->setParameter(g_state.effect, index, value);
    }
    
    return env.Undefined();
}

Napi::Value OpenEditor(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    int preferredWidth = 650;
    int preferredHeight = 450;
    
    #ifdef _WIN32
    if (info.Length() < 1 || !info[0].IsBuffer()) {
        Napi::TypeError::New(env, "Buffer expected for parentHwnd").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    Napi::Buffer<void*> buf = info[0].As<Napi::Buffer<void*>>();
    if (buf.Length() < sizeof(HWND)) {
        Napi::Error::New(env, "Invalid HWND buffer size").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    HWND parentHwnd = *reinterpret_cast<HWND*>(buf.Data());
    g_state.parentWindowHandle = parentHwnd;
    
    if (g_state.effect && (g_state.effect->flags & effFlagsHasEditor)) {
        // 1. Get preferred editor size from VST plugin
        ERect* rectPtr = nullptr;
        g_state.effect->dispatcher(g_state.effect, effEditGetRect, 0, 0, &rectPtr, 0.0f);
        if (rectPtr) {
            preferredWidth = rectPtr->right - rectPtr->left;
            preferredHeight = rectPtr->bottom - rectPtr->top;
            std::cout << "[VST HOST] VST preferred rect: " << preferredWidth << "x" << preferredHeight << std::endl;
        }
        
        // 2. Open the VST editor within the parent window HWND
        g_state.effect->dispatcher(g_state.effect, effEditOpen, 0, 0, parentHwnd, 0.0f);
        
        // 3. Enumerate and manage child windows to resolve Z-order occlusion by Chromium compositor
        struct EnumData {
            HWND parent;
            HWND vstChild = nullptr;
            HWND chromeChild = nullptr;
        };
        
        auto enumProc = [](HWND hwnd, LPARAM lParam) -> BOOL {
            EnumData* data = reinterpret_cast<EnumData*>(lParam);
            char className[256];
            if (GetClassNameA(hwnd, className, sizeof(className))) {
                std::string name(className);
                if (name.find("Chrome") != std::string::npos || 
                    name.find("Intermediate") != std::string::npos || 
                    name.find("Widget") != std::string::npos ||
                    name.find("Render") != std::string::npos) {
                    data->chromeChild = hwnd;
                    ShowWindow(hwnd, SW_HIDE); // Hide Chrome composition area so VST is visible
                } else {
                    data->vstChild = hwnd;
                }
            }
            return TRUE;
        };
        
        EnumData data;
        data.parent = parentHwnd;
        EnumChildWindows(parentHwnd, enumProc, reinterpret_cast<LPARAM>(&data));
        
        if (data.vstChild) {
            // Apply WS_CHILD | WS_VISIBLE styles and remove POPUP style
            LONG_PTR style = GetWindowLongPtr(data.vstChild, GWL_STYLE);
            style |= WS_CHILD | WS_VISIBLE;
            style &= ~WS_POPUP;
            SetWindowLongPtr(data.vstChild, GWL_STYLE, style);
            
            // Re-parent explicitly
            SetParent(data.vstChild, parentHwnd);
            
            // Size to fill parent's client area initially
            RECT rect;
            GetClientRect(parentHwnd, &rect);
            int w = rect.right - rect.left;
            int h = rect.bottom - rect.top;
            if (w <= 0 || h <= 0) {
                w = preferredWidth;
                h = preferredHeight;
            }
            SetWindowPos(data.vstChild, HWND_TOP, 0, 0, w, h, SWP_SHOWWINDOW | SWP_NOACTIVATE);
            ShowWindow(data.vstChild, SW_SHOW);
            UpdateWindow(data.vstChild);
        }
    }
    #endif
    
    Napi::Object result = Napi::Object::New(env);
    result.Set("width", Napi::Number::New(env, preferredWidth));
    result.Set("height", Napi::Number::New(env, preferredHeight));
    return result;
}

Napi::Value ResizeEditor(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    #ifdef _WIN32
    if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber()) {
        Napi::TypeError::New(env, "Numbers expected for width and height").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    int w = info[0].As<Napi::Number>().Int32Value();
    int h = info[1].As<Napi::Number>().Int32Value();
    
    HWND parentHwnd = static_cast<HWND>(g_state.parentWindowHandle);
    if (parentHwnd) {
        struct EnumData {
            HWND parent;
            HWND vstChild = nullptr;
        };
        
        auto enumProc = [](HWND hwnd, LPARAM lParam) -> BOOL {
            EnumData* data = reinterpret_cast<EnumData*>(lParam);
            char className[256];
            if (GetClassNameA(hwnd, className, sizeof(className))) {
                std::string name(className);
                if (name.find("Chrome") == std::string::npos && 
                    name.find("Intermediate") == std::string::npos && 
                    name.find("Widget") == std::string::npos &&
                    name.find("Render") == std::string::npos) {
                    data->vstChild = hwnd;
                    return FALSE; // Stop enumerating
                }
            }
            return TRUE;
        };
        
        EnumData data;
        data.parent = parentHwnd;
        EnumChildWindows(parentHwnd, enumProc, reinterpret_cast<LPARAM>(&data));
        
        if (data.vstChild) {
            SetWindowPos(data.vstChild, HWND_TOP, 0, 0, w, h, SWP_NOZORDER | SWP_NOACTIVATE | SWP_SHOWWINDOW);
            ShowWindow(data.vstChild, SW_SHOW);
            UpdateWindow(data.vstChild);
        }
    }
    #endif
    
    return env.Undefined();
}

Napi::Value CloseEditor(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    #ifdef _WIN32
    if (g_state.effect && (g_state.effect->flags & effFlagsHasEditor)) {
        g_state.effect->dispatcher(g_state.effect, effEditClose, 0, 0, nullptr, 0.0f);
    }
    g_state.parentWindowHandle = nullptr;
    #endif
    
    return env.Undefined();
}

Napi::Value UnloadPlugin(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (g_state.audioThreadRunning) {
        g_state.audioThreadRunning = false;
        if (g_state.audioThread.joinable()) {
            g_state.audioThread.join();
        }
    }
    
    if (g_state.effect) {
        g_state.effect->dispatcher(g_state.effect, effClose, 0, 0, nullptr, 0.0f);
        g_state.effect = nullptr;
    }
    
    #ifdef _WIN32
    if (g_state.libraryInstance) {
        FreeLibrary(g_state.libraryInstance);
        g_state.libraryInstance = nullptr;
    }
    #endif
    
    return env.Undefined();
}

#ifdef _WIN32
#include <unknwn.h>
#include <objbase.h>

// IASIO interface GUID: {564a8960-e5ad-11d1-ad81-00a024819696}
static const IID IID_IASIO = { 0x564a8960, 0xe5ad, 0x11d1, { 0xad, 0x81, 0x00, 0xa0, 0x24, 0x81, 0x96, 0x96 } };

interface IASIO : public IUnknown {
    virtual long init(void* sysHandle) = 0;
    virtual void getDriverName(char* name) = 0;
    virtual long getDriverVersion() = 0;
    virtual void getErrorMessage(char* string) = 0;
    virtual long start() = 0;
    virtual long stop() = 0;
    virtual long getChannels(long* numInputChannels, long* numOutputChannels) = 0;
    virtual long getLatencies(long* inputLatency, long* outputLatency) = 0;
    virtual long getBufferSize(long* minSize, long* maxSize, long* preferredSize, long* granularity) = 0;
    virtual long canSampleRate(double sampleRate) = 0;
    virtual long getSampleRate(double* sampleRate) = 0;
    virtual long setSampleRate(double sampleRate) = 0;
    virtual long getClockSources(void* clocks, long* numSources) = 0;
    virtual long setClockSource(long reference) = 0;
    virtual long getSamplePosition(void* sPos, void* tStamp) = 0;
    virtual long getChannelInfo(void* info) = 0;
    virtual long createBuffers(void* bufferInfos, long numChannels, long bufferSize, void* callbacks) = 0;
    virtual long disposeBuffers() = 0;
    virtual long controlPanel() = 0;
    virtual long future(long selector, void* opt) = 0;
    virtual long outputReady() = 0;
};

struct ASIOChannelInfo {
    long channel;
    long isInput;
    long isActive;
    long channelGroup;
    long type; // ASIOSampleType
    char name[32];
};

bool GetAsioDriverCLSID(const std::string& driverName, CLSID& clsid) {
    std::string subKey = "SOFTWARE\\ASIO\\" + driverName;
    HKEY hkey;
    if (RegOpenKeyExA(HKEY_LOCAL_MACHINE, subKey.c_str(), 0, KEY_READ, &hkey) != ERROR_SUCCESS) {
        subKey = "SOFTWARE\\WOW6432Node\\ASIO\\" + driverName;
        if (RegOpenKeyExA(HKEY_LOCAL_MACHINE, subKey.c_str(), 0, KEY_READ, &hkey) != ERROR_SUCCESS) {
            return false;
        }
    }
    
    char clsidStr[128] = {0};
    DWORD size = sizeof(clsidStr);
    if (RegQueryValueExA(hkey, "clsid", NULL, NULL, (LPBYTE)clsidStr, &size) != ERROR_SUCCESS) {
        RegCloseKey(hkey);
        return false;
    }
    RegCloseKey(hkey);
    
    wchar_t wClsidStr[128];
    MultiByteToWideChar(CP_ACP, 0, clsidStr, -1, wClsidStr, 128);
    
    if (CLSIDFromString(wClsidStr, &clsid) != NOERROR) {
        return false;
    }
    
    return true;
}

Napi::Value GetAsioDriverDetails(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected for driverName").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    std::string driverName = info[0].As<Napi::String>().Utf8Value();
    
    CLSID clsid;
    if (!GetAsioDriverCLSID(driverName, clsid)) {
        Napi::Error::New(env, "ASIO Driver registry CLSID not found").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    HRESULT hr = CoInitializeEx(NULL, COINIT_APARTMENTTHREADED);
    
    void* pInterface = nullptr;
    hr = CoCreateInstance(clsid, NULL, CLSCTX_INPROC_SERVER, IID_IASIO, &pInterface);
    
    if (FAILED(hr)) {
        CoUninitialize();
        Napi::Error::New(env, "Failed to instantiate ASIO driver COM object").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    IASIO* iasio = static_cast<IASIO*>(pInterface);
    
    if (!iasio->init(NULL)) {
        iasio->Release();
        CoUninitialize();
        Napi::Error::New(env, "Failed to initialize ASIO driver").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    long numInputs = 0;
    long numOutputs = 0;
    iasio->getChannels(&numInputs, &numOutputs);
    
    long minSize = 0;
    long maxSize = 0;
    long preferredSize = 0;
    long granularity = 0;
    iasio->getBufferSize(&minSize, &maxSize, &preferredSize, &granularity);
    
    long inputLatency = 0;
    long outputLatency = 0;
    iasio->getLatencies(&inputLatency, &outputLatency);
    
    double sampleRate = 44100.0;
    iasio->getSampleRate(&sampleRate);
    
    Napi::Array inputNames = Napi::Array::New(env);
    Napi::Array outputNames = Napi::Array::New(env);
    
    for (int i = 0; i < numInputs; ++i) {
        ASIOChannelInfo chanInfo = {0};
        chanInfo.channel = i;
        chanInfo.isInput = 1;
        if (iasio->getChannelInfo(&chanInfo) == 0) {
            inputNames.Set(i, Napi::String::New(env, chanInfo.name));
        } else {
            inputNames.Set(i, Napi::String::New(env, "Input " + std::to_string(i + 1)));
        }
    }
    
    for (int i = 0; i < numOutputs; ++i) {
        ASIOChannelInfo chanInfo = {0};
        chanInfo.channel = i;
        chanInfo.isInput = 0;
        if (iasio->getChannelInfo(&chanInfo) == 0) {
            outputNames.Set(i, Napi::String::New(env, chanInfo.name));
        } else {
            outputNames.Set(i, Napi::String::New(env, "Output " + std::to_string(i + 1)));
        }
    }
    
    iasio->Release();
    CoUninitialize();
    
    Napi::Object result = Napi::Object::New(env);
    result.Set("name", Napi::String::New(env, driverName));
    result.Set("inputsCount", Napi::Number::New(env, numInputs));
    result.Set("outputsCount", Napi::Number::New(env, numOutputs));
    result.Set("inputChannels", inputNames);
    result.Set("outputChannels", outputNames);
    result.Set("minBufferSize", Napi::Number::New(env, minSize));
    result.Set("maxBufferSize", Napi::Number::New(env, maxSize));
    result.Set("preferredBufferSize", Napi::Number::New(env, preferredSize));
    result.Set("bufferSizeGranularity", Napi::Number::New(env, granularity));
    result.Set("inputLatencySamples", Napi::Number::New(env, inputLatency));
    result.Set("outputLatencySamples", Napi::Number::New(env, outputLatency));
    result.Set("sampleRate", Napi::Number::New(env, sampleRate));
    
    return result;
}

Napi::Value OpenAsioControlPanel(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected for driverName").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    std::string driverName = info[0].As<Napi::String>().Utf8Value();
    
    CLSID clsid;
    if (!GetAsioDriverCLSID(driverName, clsid)) {
        Napi::Error::New(env, "ASIO Driver registry CLSID not found").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    HRESULT hr = CoInitializeEx(NULL, COINIT_APARTMENTTHREADED);
    void* pInterface = nullptr;
    hr = CoCreateInstance(clsid, NULL, CLSCTX_INPROC_SERVER, IID_IASIO, &pInterface);
    
    if (FAILED(hr)) {
        CoUninitialize();
        Napi::Error::New(env, "Failed to instantiate ASIO driver COM object").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    IASIO* iasio = static_cast<IASIO*>(pInterface);
    
    if (iasio->init(NULL)) {
        iasio->controlPanel();
    }
    
    iasio->Release();
    CoUninitialize();
    
    return env.Undefined();
}
#else
// Cross-platform stubs for macOS / Linux
Napi::Value GetAsioDriverDetails(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    return env.Null();
}

Napi::Value OpenAsioControlPanel(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    return env.Undefined();
}
#endif

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("loadPlugin", Napi::Function::New(env, LoadPlugin));
    exports.Set("setSharedBuffer", Napi::Function::New(env, SetSharedBuffer));
    exports.Set("startAudioThread", Napi::Function::New(env, StartAudioThread));
    exports.Set("stopAudioThread", Napi::Function::New(env, StopAudioThread));
    exports.Set("getParams", Napi::Function::New(env, GetParams));
    exports.Set("setParam", Napi::Function::New(env, SetParam));
    exports.Set("openEditor", Napi::Function::New(env, OpenEditor));
    exports.Set("resizeEditor", Napi::Function::New(env, ResizeEditor));
    exports.Set("closeEditor", Napi::Function::New(env, CloseEditor));
    exports.Set("unloadPlugin", Napi::Function::New(env, UnloadPlugin));
    
    exports.Set("getAsioDriverDetails", Napi::Function::New(env, GetAsioDriverDetails));
    exports.Set("openAsioControlPanel", Napi::Function::New(env, OpenAsioControlPanel));
    
    return exports;
}

NODE_API_MODULE(omega_vst_host, Init)
