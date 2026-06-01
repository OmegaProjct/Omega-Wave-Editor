#ifndef VST2_TYPES_H
#define VST2_TYPES_H

#include <stdint.h>

// VST2 Opcodes
enum VstOpcodes {
    effOpen = 0,
    effClose,
    effSetProgram,
    effGetProgram,
    effSetProgramName,
    effGetProgramName,
    effGetParamLabel,
    effGetParamDisplay,
    effGetParamName,
    effGetParameter = 9,
    effSetParameter = 10,
    effSetSampleRate = 10,
    effSetBlockSize = 11,
    effMainsChanged = 12,
    effEditGetRect = 13,
    effEditOpen = 14,
    effEditClose = 15,
    effEditIdle = 19,
    effGetEffectName = 45,
    effGetVendorString = 47,
    effGetProductString = 48,
    effGetVendorVersion = 49,
    effCanDo = 51,
    effProcessEvents = 25
};

enum VstMasterOpcodes {
    audioMasterVersion = 1
};

struct AEffect;

typedef intptr_t (*audioMasterCallback)(AEffect* effect, int32_t opcode, int32_t index, intptr_t value, void* ptr, float opt);
typedef intptr_t (*AEffectDispatcherProc)(AEffect* effect, int32_t opcode, int32_t index, intptr_t value, void* ptr, float opt);
typedef void (*AEffectProcessProc)(AEffect* effect, float** inputs, float** outputs, int32_t sampleframes);
typedef void (*AEffectSetParameterProc)(AEffect* effect, int32_t index, float parameter);
typedef float (*AEffectGetParameterProc)(AEffect* effect, int32_t index);

struct AEffect {
    int32_t magic; // 'VstP'
    AEffectDispatcherProc dispatcher;
    AEffectProcessProc process; // deprecated in VST 2.4, but kept for compatibility
    AEffectSetParameterProc setParameter;
    AEffectGetParameterProc getParameter;
    
    int32_t numPrograms;
    int32_t numParams;
    int32_t numInputs;
    int32_t numOutputs;
    
    int32_t flags;
    
    intptr_t resvd1;
    intptr_t resvd2;
    
    int32_t initialDelay;
    
    int32_t realQualities;
    int32_t offQualities;
    float ioRatio;
    
    void* object;
    void* user;
    
    int32_t uniqueID;
    int32_t version;
    
    AEffectProcessProc processReplacing;
    AEffectProcessProc processDoubleReplacing;
    
    char future[56];
};

#define kEffectMagic 0x56737450 // 'VstP'

// Flags
enum AEffectFlags {
    effFlagsHasEditor = 1 << 0,
    effFlagsCanReplacing = 1 << 4,
    effFlagsIsSynth = 1 << 8
};

// VST2 MIDI structures
struct VstMidiEvent {
    int32_t type;            // kVstMidiType = 1
    int32_t byteSize;        // 24
    int32_t deltaFrames;     // Sample offset in block
    int32_t flags;
    int32_t noteLength;
    int32_t noteOffset;
    char midiData[4];        // [status, data1, data2, 0]
    char detune;
    char noteOffVelocity;
    char reserved1;
    char reserved2;
};

struct VstEventHeader {
    int32_t type;            // kVstMidiType = 1
    int32_t byteSize;        // 24
};

struct VstEvents {
    int32_t numEvents;
    intptr_t reserved;
    VstMidiEvent* events[256];
};

struct ERect {
    int16_t top;
    int16_t left;
    int16_t bottom;
    int16_t right;
};

#endif
