
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useContext } from 'react';
import { MusicContext } from '@/context/MusicContext';

interface MusicVisualizerProps {
    // The props are no longer needed as we get everything from context
}

const NUM_BARS = 5;

export function MusicVisualizer(props: MusicVisualizerProps) {
    const musicContext = useContext(MusicContext);
    const isPlaying = musicContext?.isPlaying ?? false;
    const analyser = musicContext?.analyser;

    const [barHeights, setBarHeights] = useState(new Array(NUM_BARS).fill(0));
    const animationFrameId = useRef<number>(0);

    useEffect(() => {
        const animate = () => {
            if (!analyser) {
                cancelAnimationFrame(animationFrameId.current);
                return;
            }

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteFrequencyData(dataArray);

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

        if (isPlaying && analyser) {
            animate();
        } else {
            cancelAnimationFrame(animationFrameId.current);
            setBarHeights(new Array(NUM_BARS).fill(0));
        }

        return () => {
            cancelAnimationFrame(animationFrameId.current);
        };

    }, [isPlaying, analyser]);

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
