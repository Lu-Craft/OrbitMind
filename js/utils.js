// Color and styling utility functions for OrbiMind

export function hexToRgb(hex) {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 128, g: 128, b: 128 };
}

export function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
}

export function getHslColor(hex, lAdjustment = 0, sAdjustment = 0) {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return hex;
    const { r, g, b } = hexToRgb(hex);
    const { h, s, l } = rgbToHsl(r, g, b);
    const newL = Math.max(0, Math.min(100, l + lAdjustment));
    const newS = Math.max(0, Math.min(100, s + sAdjustment));
    return `hsl(${h}, ${newS}%, ${newL}%)`;
}

export function hexToRgbA(hex, alpha) {
    let c;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x' + c.join('');
        return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+alpha+')';
    }
    return 'rgba(255,255,255,'+alpha+')';
}

export function getNodeColor(node) {
    if (!node) return "#ffffff";
    if (node.color) return node.color;
    if (node.type === "sun") return "#ffd600";
    if (node.type === "planet") return "#00f2fe";
    if (node.type === "planetoid") return "#ff7b00";
    if (node.type === "moon") return "#00ff87";
    if (node.type === "satellite") return "#a8afb8";
    if (node.attachments && node.attachments.length > 0) {
        const ext = node.attachments[0].name.split('.').pop().toLowerCase();
        if (ext === 'pdf') return "#00e676";
        return "#a8afb8";
    }
    return "#ffffff";
}
