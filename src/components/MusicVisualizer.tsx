
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface MusicVisualizerProps {
    audioRef: React.RefObject<HTMLAudioElement>;
    isPlaying: boolean;
}

const NUM_BARS = 5;

export function MusicVisualizer({ audioRef, isPlaying }: MusicVisualizerProps) {
    const [barHeights, setBarHeights] = useState(new Array(NUM_BARS).fill(0));
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const animationFrameId = useRef<number>(0);

    useEffect(() => {
        if (!audioRef.current) return;
        
        const setupAudioContext = () => {
            if (!audioContextRef.current) {
                try {
                    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                } catch (e) {
                    console.error("Web Audio API is not supported in this browser");
                    return;
                }
            }

            if (!analyserRef.current) {
                 analyserRef.current = audioContextRef.current.createAnalyser();
                 analyserRef.current.fftSize = 256;
            }

            if (!sourceRef.current) {
                sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
                sourceRef.current.connect(analyserRef.current);
                analyserRef.current.connect(audioContextRef.current.destination);
            }
        };

        // Delay context creation until user interacts (isPlaying)
        if (isPlaying && !audioContextRef.current) {
             setupAudioContext();
        }

        const animate = () => {
            if (!analyserRef.current) {
                cancelAnimationFrame(animationFrameId.current);
                return;
            }

            const bufferLength = analyserRef.current.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyserRef.current.getByteFrequencyData(dataArray);

            const newBarHeights = [];
            const barWidth = Math.floor(bufferLength / NUM_BARS);

            for (let i = 0; i < NUM_BARS; i++) {
                let sum = 0;
                for (let j = 0; j < barWidth; j++) {
                    sum += dataArray[i * barWidth + j];
                }
                const avg = sum / barWidth;
                newBarHeights.push(Math.max(2, (avg / 255) * 100)); // Ensure a min height of 2px
            }

            setBarHeights(newBarHeights);
            animationFrameId.current = requestAnimationFrame(animate);
        };

        if (isPlaying) {
             if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume();
            }
            animate();
        } else {
            cancelAnimationFrame(animationFrameId.current);
            setBarHeights(new Array(NUM_BARS).fill(0));
        }

        return () => {
            cancelAnimationFrame(animationFrameId.current);
        };

    }, [isPlaying, audioRef]);
    
    // When the component unmounts, disconnect the audio graph to free up resources
    useEffect(() => {
        return () => {
            sourceRef.current?.disconnect();
            analyserRef.current?.disconnect();
        }
    },[]);

    return (
        <div className="flex items-end justify-center h-6 w-10 gap-1">
            {barHeights.map((height, index) => (
                <div
                    key={index}
                    className={cn(
                        'w-1 bg-primary rounded-full transition-all duration-100 ease-out',
                        !isPlaying && 'h-[2px]'
                    )}
                    style={{ height: `${isPlaying ? height : 0}%` }}
                />
            ))}
        </div>
    );
}

