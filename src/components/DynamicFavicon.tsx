
'use client';

import { useEffect, useState } from 'react';

// Function to convert HSL string 'H S% L%' to a hex color
function hslToHex(hslStr: string): string {
    const [h, s, l] = hslStr.match(/\d+/g)!.map(Number);
    const sDecimal = s / 100;
    const lDecimal = l / 100;
    const c = (1 - Math.abs(2 * lDecimal - 1)) * sDecimal;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = lDecimal - c / 2;
    let r = 0, g = 0, b = 0;

    if (h >= 0 && h < 60) {
        r = c; g = x; b = 0;
    } else if (h >= 60 && h < 120) {
        r = x; g = c; b = 0;
    } else if (h >= 120 && h < 180) {
        r = 0; g = c; b = x;
    } else if (h >= 180 && h < 240) {
        r = 0; g = x; b = c;
    } else if (h >= 240 && h < 300) {
        r = x; g = 0; b = c;
    } else if (h >= 300 && h < 360) {
        r = c; g = 0; b = x;
    }

    const toHex = (val: number) => {
        const hex = Math.round((val + m) * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}


export default function DynamicFavicon() {
  const [faviconHref, setFaviconHref] = useState<string | null>(null);

  const updateFavicon = () => {
    // We get the computed style of the primary color
    const primaryColorHsl = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    if (!primaryColorHsl) return;

    const color = hslToHex(primaryColorHsl);

    const barHeights = [40, 75, 50, 60, 30];
    const svgContent = `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g transform="translate(4, 4) scale(0.66)">
                <g class="flex items-end justify-center h-24 w-24 gap-1">
                    ${barHeights.map((height, index) => `
                        <rect 
                            x="${4 + index * 4}" 
                            y="${24 - (height / 100 * 24)}" 
                            width="3" 
                            height="${height / 100 * 24}" 
                            fill="${color}" 
                            rx="1.5"
                        />
                    `).join('')}
                </g>
            </g>
        </svg>
    `.replace(/\s+/g, ' ').trim();

    const newFaviconHref = `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
    setFaviconHref(newFaviconHref);
  };

  useEffect(() => {
    // Initial update
    updateFavicon();

    // Listen for theme changes from ThemeManager
    window.addEventListener('theme-changed', updateFavicon);

    // Also observe style changes on the root element
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                updateFavicon();
                break;
            }
        }
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => {
        window.removeEventListener('theme-changed', updateFavicon);
        observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (faviconHref) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (link) {
        link.href = faviconHref;
      } else {
        link = document.createElement('link');
        link.rel = 'icon';
        link.href = faviconHref;
        document.getElementsByTagName('head')[0].appendChild(link);
      }
    }
  }, [faviconHref]);

  return null;
}
