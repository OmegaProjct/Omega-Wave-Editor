#ifndef RING_BUFFER_H
#define RING_BUFFER_H

#include <stdint.h>
#include <atomic>

class AudioRingBuffer {
private:
    float* buffer;
    int32_t capacity;
    std::atomic<int32_t>* writePtr;
    std::atomic<int32_t>* readPtr;

public:
    AudioRingBuffer(float* sabMem, int32_t size) {
        // Elements: [write_index, read_index, size, ... data ...]
        writePtr = reinterpret_cast<std::atomic<int32_t>*>(&sabMem[0]);
        readPtr = reinterpret_cast<std::atomic<int32_t>*>(&sabMem[1]);
        capacity = size;
        buffer = &sabMem[3]; // Data starts at offset 3
    }

    int32_t getAvailableRead() const {
        int32_t w = writePtr->load(std::memory_order_acquire);
        int32_t r = readPtr->load(std::memory_order_relaxed);
        int32_t diff = w - r;
        if (diff < 0) diff += capacity;
        return diff;
    }

    int32_t getAvailableWrite() const {
        int32_t w = writePtr->load(std::memory_order_relaxed);
        int32_t r = readPtr->load(std::memory_order_acquire);
        int32_t diff = r - w - 1;
        if (diff < 0) diff += capacity;
        return diff;
    }

    int32_t read(float* dest, int32_t count) {
        int32_t available = getAvailableRead();
        if (count > available) count = available;
        if (count == 0) return 0;

        int32_t r = readPtr->load(std::memory_order_relaxed);
        for (int32_t i = 0; i < count; ++i) {
            dest[i] = buffer[r];
            r = (r + 1) % capacity;
        }
        readPtr->store(r, std::memory_order_release);
        return count;
    }

    int32_t write(const float* src, int32_t count) {
        int32_t available = getAvailableWrite();
        if (count > available) count = available;
        if (count == 0) return 0;

        int32_t w = writePtr->load(std::memory_order_relaxed);
        for (int32_t i = 0; i < count; ++i) {
            buffer[w] = src[i];
            w = (w + 1) % capacity;
        }
        writePtr->store(w, std::memory_order_release);
        return count;
    }
};

class MidiRingBuffer {
private:
    int32_t* buffer;
    int32_t capacity; // In number of events (each event is 4 int32s)
    std::atomic<int32_t>* writePtr;
    std::atomic<int32_t>* readPtr;

public:
    MidiRingBuffer(int32_t* sabMem, int32_t eventCapacity) {
        // Elements: [write_index, read_index, capacity, ... events ...]
        // Each event is: [sampleOffset, status, data1, data2]
        writePtr = reinterpret_cast<std::atomic<int32_t>*>(&sabMem[0]);
        readPtr = reinterpret_cast<std::atomic<int32_t>*>(&sabMem[1]);
        capacity = eventCapacity;
        buffer = &sabMem[3]; // Data starts at offset 3
    }

    int32_t getAvailableRead() const {
        int32_t w = writePtr->load(std::memory_order_acquire);
        int32_t r = readPtr->load(std::memory_order_relaxed);
        int32_t diff = w - r;
        if (diff < 0) diff += capacity;
        return diff;
    }

    // Reads up to count events. Each event is populated as 4 int32s.
    int32_t readEvents(int32_t* dest, int32_t count) {
        int32_t available = getAvailableRead();
        if (count > available) count = available;
        if (count == 0) return 0;

        int32_t r = readPtr->load(std::memory_order_relaxed);
        for (int32_t i = 0; i < count; ++i) {
            int32_t idx = r * 4;
            dest[i * 4 + 0] = buffer[idx + 0];
            dest[i * 4 + 1] = buffer[idx + 1];
            dest[i * 4 + 2] = buffer[idx + 2];
            dest[i * 4 + 3] = buffer[idx + 3];
            r = (r + 1) % capacity;
        }
        readPtr->store(r, std::memory_order_release);
        return count;
    }
};

#endif
