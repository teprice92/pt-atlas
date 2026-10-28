// Original line icons (24px grid, stroke = currentColor). Decorative only: callers supply accessible text.
const paths={
 home:'<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9v11h5v-6h3v6h5V9"/>',
 library:'<rect x="3.5" y="4" width="5" height="16" rx="1.5"/><rect x="10.5" y="4" width="5" height="16" rx="1.5"/><path d="m17.6 4.8 3 14.6"/>',
 heart:'<path d="M12 20.3s-7.4-4.5-9.1-9C1.6 7.9 3.7 4.6 7 4.6c2 0 3.7 1.1 5 3 1.3-1.9 3-3 5-3 3.3 0 5.4 3.3 4.1 6.7-1.7 4.5-9.1 9-9.1 9z"/>',
 heartFill:'<path fill="currentColor" d="M12 20.3s-7.4-4.5-9.1-9C1.6 7.9 3.7 4.6 7 4.6c2 0 3.7 1.1 5 3 1.3-1.9 3-3 5-3 3.3 0 5.4 3.3 4.1 6.7-1.7 4.5-9.1 9-9.1 9z"/>',
 import:'<path d="M12 3.5v11"/><path d="m7.5 10 4.5 4.5 4.5-4.5"/><path d="M4 15v3.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V15"/>',
 settings:'<path d="M4 6.5h9M17 6.5h3M4 12h3M11 12h9M4 17.5h11M19 17.5h1"/><circle cx="15" cy="6.5" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="17.5" r="2"/>',
 search:'<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 sidebar:'<rect x="3" y="4.5" width="18" height="15" rx="3"/><path d="M9 4.5v15"/>',
 arrow:'<path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5"/>',
 chevron:'<path d="m9.5 6 6 6-6 6"/>',
 back:'<path d="m14.5 6-6 6 6 6"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M2.5 12h2M19.5 12h2M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
 moon:'<path d="M20 14.6A8 8 0 0 1 9.4 4a8 8 0 1 0 10.6 10.6z"/>',
 system:'<rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M8.5 20h7M12 16.5V20"/>',
 shield:'<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/>',
 edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
 trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
 download:'<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14"/>',
 alert:'<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.2v.3"/>',
 doc:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
 wifi:'<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.6 16a5 5 0 0 1 6.8 0"/><circle cx="12" cy="19.3" r="1" fill="currentColor"/>',
 database:'<ellipse cx="12" cy="5.5" rx="7.5" ry="2.5"/><path d="M4.5 5.5v13c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5v-13M4.5 12c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5"/>',
 up:'<path d="m6 15 6-6 6 6"/>',
 down:'<path d="m6 9 6 6 6-6"/>',
 collection:'<rect x="3.5" y="7" width="17" height="13" rx="2.5"/><path d="M6 4h12M8.5 1.8h7"/>',
 link:'<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
 history:'<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4v4h4"/><path d="M12 7.5V12l3 2"/>',
 print:'<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14h10v6.5H7z"/>',
 phases:'<circle cx="5" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><path d="M5 8v8M10 6h10M10 12h7M10 18h10"/>',
 // Body regions
 hip:'<path d="M3.5 6c2.2 1.2 4.4 1.2 6 0 .4 2.7 1.3 4.5 2.5 4.5s2.1-1.8 2.5-4.5c1.6 1.2 3.8 1.2 6 0-.4 5-2.6 8-5.2 9.5l-.8 3.5h-5l-.8-3.5C6.1 14 3.9 11 3.5 6z"/><circle cx="8.2" cy="13.5" r="1.4"/><circle cx="15.8" cy="13.5" r="1.4"/>',
 knee:'<path d="M9 2.5v7c0 1.5 1.2 2.5 3 2.5s3-1 3-2.5v-7"/><path d="M9 21.5v-6c0-1.5 1.2-2.5 3-2.5s3 1 3 2.5v6"/><circle cx="17.8" cy="12.5" r="1.6"/>',
 shoulder:'<path d="M2.5 10.5C5.5 7.5 9.5 6 13.5 6.5"/><circle cx="17" cy="9.5" r="3"/><path d="M17 12.5v9M14 6.8 12.2 3.5"/>',
 spine:'<rect x="8.5" y="2.5" width="7" height="4" rx="1.6"/><rect x="8" y="10" width="8" height="4" rx="1.6"/><rect x="7.5" y="17.5" width="9" height="4" rx="1.6"/><path d="M5.5 4.5h3M15.5 4.5h3M5 12h3M16 12h3M4.5 19.5h3M16.5 19.5h3"/>',
 foot:'<path d="M8.5 2.5v10.7c0 1.8-1.8 2.9-2.8 4.3-1 1.4-.6 3.5 1.4 3.5h12c1.5 0 2-1.5 1-2.5-2-2-5-2.4-6.4-4.3L13.5 2.5"/>',
 hand:'<path d="M7.5 21v-6.5L5 11a1.5 1.5 0 0 1 2.4-1.8L9 11.3V4.8a1.5 1.5 0 0 1 3 0V11V3.8a1.5 1.5 0 0 1 3 0V11V5.3a1.5 1.5 0 0 1 3 0V14c0 3.6-2.2 7-5.4 7z"/>',
 neuro:'<circle cx="12" cy="5" r="2"/><circle cx="5" cy="11.5" r="2"/><circle cx="19" cy="11.5" r="2"/><circle cx="8" cy="19" r="2"/><circle cx="16" cy="19" r="2"/><path d="M10.5 6.4 6.5 10M13.5 6.4l4 3.6M5.8 13.4l1.4 3.8M18.2 13.4l-1.4 3.8M10 19h4M7 11.5h10"/>',
 cardio:'<path d="M20.3 12.5c.4-.4.7-.8.8-1.2 1.3-3.4-.8-6.7-4.1-6.7-2 0-3.7 1.1-5 3-1.3-1.9-3-3-5-3-3.3 0-5.4 3.3-4.1 6.7 1.7 4.5 9.1 9 9.1 9s2.5-1.5 4.9-3.6"/><path d="M3 12h4.2l1.8-2.8 2.6 5.6 1.9-2.8H21"/>',
 vestibular:'<path d="M12 12.2a1.8 1.8 0 1 1 1.8-1.8c0 2.4-2 4.3-4.3 4.3A4.4 4.4 0 0 1 5.1 10.3a6.9 6.9 0 0 1 6.9-6.9 6.9 6.9 0 0 1 6.9 6.9c0 5.4-4.4 9.8-9.8 9.8"/>',
 other:'<rect x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8"/><path d="M16.75 14v6M13.75 17h6"/>'
};
export function icon(name,size=20){return `<svg class="i" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]||''}</svg>`}

// Brand mark: a summit "A" whose open interior holds a column of vertebrae. Gradient is defined once in brandDefs().
export function brandDefs(){return `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs><linearGradient id="atlas-g" x1="136" y1="388" x2="376" y2="132" gradientUnits="userSpaceOnUse"><stop stop-color="#527DFF"/><stop offset="1" stop-color="#18A999"/></linearGradient></defs></svg>`}
export function brandMark(size=36,{tile=true}={}){return `<svg class="mark" width="${size}" height="${size}" viewBox="0 0 512 512" aria-hidden="true" focusable="false">${tile?'<rect width="512" height="512" rx="116" fill="#101827"/>':''}<path d="M136 388 256 132l120 256" fill="none" stroke="url(#atlas-g)" stroke-width="58" stroke-linecap="round" stroke-linejoin="round"/><g fill="${tile?'#fff':'currentColor'}"><rect x="238" y="262" width="36" height="28" rx="11"/><rect x="232" y="304" width="48" height="30" rx="12" opacity=".86"/><rect x="225" y="348" width="62" height="32" rx="13" opacity=".72"/></g></svg>`}

// Deterministic topographic contour lines for the hero illustration (an "atlas" motif).
export const contours=(()=>{let out='';for(let k=0;k<10;k++){const r=26+k*30;let d='';for(let i=0;i<=96;i++){const t=i/96*Math.PI*2,rr=r*(1+.1*Math.sin(3*t+k*.55)+.05*Math.cos(5*t-k*.8));d+=(i?'L':'M')+(300+rr*Math.cos(t)*1.3).toFixed(1)+' '+(250+rr*Math.sin(t)*.9).toFixed(1)}out+=`<path d="${d}Z"/>`}return out})();
