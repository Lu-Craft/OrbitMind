// Markdown, Active Recall and SVG charting parser for OrbiMind study sheets
import { hexToRgbA } from './utils.js';

function parseChartParams(paramStr) {
    const params = {};
    const regex = /(\w+)=(?:"([^"]*)"|'([^']*)'|([^\s]+))/g;
    let match;
    while ((match = regex.exec(paramStr)) !== null) {
        const key = match[1];
        const value = match[2] || match[3] || match[4] || "";
        params[key] = value;
    }
    return params;
}

function renderSvgChart(params, nodeColor) {
    const tipo = params.tipo || 'bar';
    const rawValores = params.valores || '';
    const rawEtiquetas = params.etiquetas || '';
    const titulo = params.titulo || '';

    const valores = rawValores ? rawValores.split(',').map(Number) : [];
    const etiquetas = rawEtiquetas ? rawEtiquetas.split(',') : [];

    if (valores.length === 0) {
        return `<div class="study-chart-container"><div class="study-chart-title">Error: Sin valores para gráfico</div></div>`;
    }

    const maxVal = Math.max(...valores, 1);
    const chartId = Math.random().toString(36).substring(2, 9);

    const width = 500;
    const height = 300;
    const paddingLeft = 50;
    const paddingRight = 30;
    const paddingTop = 40;
    const paddingBottom = 40;

    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    // Grid lines
    let gridLinesHtml = '';
    const gridDivisions = 4;
    for (let i = 0; i <= gridDivisions; i++) {
        const ratio = i / gridDivisions;
        const y = paddingTop + plotHeight * (1 - ratio);
        const val = Math.round(maxVal * ratio * 10) / 10;
        
        gridLinesHtml += `<line x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" stroke="rgba(255,255,255,0.08)" stroke-width="1" />`;
        gridLinesHtml += `<text x="${paddingLeft - 10}" y="${y + 4}" fill="rgba(255,255,255,0.4)" font-size="10" text-anchor="end">${val}</text>`;
    }

    let chartContentHtml = '';
    
    if (tipo === 'line') {
        const points = [];
        const numPoints = valores.length;
        const xStep = numPoints > 1 ? plotWidth / (numPoints - 1) : plotWidth;

        for (let i = 0; i < numPoints; i++) {
            const x = paddingLeft + i * xStep;
            const y = paddingTop + plotHeight - (valores[i] / maxVal) * plotHeight;
            points.push({ x, y });
        }

        if (points.length > 0) {
            let areaPath = `M ${points[0].x} ${paddingTop + plotHeight} `;
            points.forEach(p => {
                areaPath += `L ${p.x} ${p.y} `;
            });
            areaPath += `L ${points[points.length - 1].x} ${paddingTop + plotHeight} Z`;
            chartContentHtml += `<path d="${areaPath}" fill="url(#grad-${chartId})" opacity="0.25" />`;
        }

        if (points.length > 0) {
            let linePath = `M ${points[0].x} ${points[0].y} `;
            for (let i = 1; i < points.length; i++) {
                linePath += `L ${points[i].x} ${points[i].y} `;
            }
            chartContentHtml += `<path d="${linePath}" stroke="${nodeColor}" stroke-width="3" fill="none" filter="url(#glow-${chartId})" />`;
        }

        points.forEach((p, i) => {
            chartContentHtml += `<circle cx="${p.x}" cy="${p.y}" r="5" fill="#ffffff" stroke="${nodeColor}" stroke-width="2" />`;
            chartContentHtml += `<text x="${p.x}" y="${p.y - 10}" fill="#ffffff" font-size="10" font-weight="600" text-anchor="middle">${valores[i]}</text>`;
            if (etiquetas[i]) {
                chartContentHtml += `<text x="${p.x}" y="${height - 15}" fill="rgba(255,255,255,0.6)" font-size="10" text-anchor="middle">${etiquetas[i]}</text>`;
            }
        });

    } else {
        const numBars = valores.length;
        const spacing = plotWidth / numBars;
        const barWidth = spacing * 0.6;

        for (let i = 0; i < numBars; i++) {
            const barHeight = (valores[i] / maxVal) * plotHeight;
            const x = paddingLeft + i * spacing + (spacing - barWidth) / 2;
            const y = paddingTop + plotHeight - barHeight;

            chartContentHtml += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" ry="4" fill="url(#grad-${chartId})" stroke="${nodeColor}" stroke-width="1.5" filter="url(#glow-${chartId})" />`;
            chartContentHtml += `<text x="${x + barWidth / 2}" y="${y - 8}" fill="#ffffff" font-size="10" font-weight="600" text-anchor="middle">${valores[i]}</text>`;
            if (etiquetas[i]) {
                chartContentHtml += `<text x="${x + barWidth / 2}" y="${height - 15}" fill="rgba(255,255,255,0.6)" font-size="10" text-anchor="middle">${etiquetas[i]}</text>`;
            }
        }
    }

    return `
    <div class="study-chart-container">
        ${titulo ? `<div class="study-chart-title">${titulo}</div>` : ''}
        <svg class="study-chart-svg" viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto;">
            <defs>
                <linearGradient id="grad-${chartId}" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="${nodeColor}" stop-opacity="1" />
                    <stop offset="100%" stop-color="${nodeColor}" stop-opacity="0.1" />
                </linearGradient>
                <filter id="glow-${chartId}" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>
            <line x1="${paddingLeft}" y1="${paddingTop}" x2="${paddingLeft}" y2="${height - paddingBottom}" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
            <line x1="${paddingLeft}" y1="${height - paddingBottom}" x2="${width - paddingRight}" y2="${height - paddingBottom}" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
            ${gridLinesHtml}
            ${chartContentHtml}
        </svg>
    </div>
    `;
}

export function parseMarkdownInline(text, nodeColor) {
    if (!text) return "";
    let res = text;
    
    // 1. Highlight: ==text==
    res = res.replace(/==(.*?)==/g, (match, inner) => {
        const rgbaBg = hexToRgbA(nodeColor, 0.16);
        const rgbaBorder = hexToRgbA(nodeColor, 0.6);
        const rgbaGlow = hexToRgbA(nodeColor, 0.25);
        return `<mark style="background: ${rgbaBg}; border-bottom: 2px solid ${rgbaBorder}; color: ${nodeColor}; text-shadow: 0 0 6px ${rgbaGlow};">${inner}</mark>`;
    });

    // 2. Bold: **text**
    res = res.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // 3. Italic: *text*
    res = res.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // 4. Code: `text`
    res = res.replace(/`(.*?)`/g, '<code>$1</code>');

    return res;
}

export function parseMarkdown(md, nodeColor = "#00f2fe") {
    if (!md) return "";

    // Extract display math blocks ($$.*$$)
    const displayMath = [];
    let tempMd = md.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
        const placeholder = `\uFFFCdisplayMath${displayMath.length}\uFFFC`;
        displayMath.push(math);
        return placeholder;
    });

    // Extract inline math blocks ($.*$)
    const inlineMath = [];
    tempMd = tempMd.replace(/\$([^$]+)\$/g, (match, math) => {
        const placeholder = `\uFFFCinlineMath${inlineMath.length}\uFFFC`;
        inlineMath.push(math);
        return placeholder;
    });

    let html = tempMd
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Extract code blocks
    const codeBlocks = [];
    html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
        const placeholder = `\uFFFCcode${codeBlocks.length}\uFFFC`;
        codeBlocks.push(code);
        return placeholder;
    });

    // Extract charts
    const charts = [];
    html = html.replace(/\[grafico\s+([^\]]+)\]/gi, (match, paramStr) => {
        const placeholder = `\uFFFCchart${charts.length}\uFFFC`;
        const params = parseChartParams(paramStr);
        const svgHtml = renderSvgChart(params, nodeColor);
        charts.push(svgHtml);
        return placeholder;
    });

    // Extract footnotes/references definitions
    const footnotes = {};
    html = html.replace(/^\s*\[\^(\d+)\]:\s*(.*)$/gm, (match, num, content) => {
        footnotes[num] = content;
        return "";
    });

    // Replace footnote links
    html = html.replace(/\[\^(\d+)\]/g, (match, num) => {
        return `<span class="reference-badge" data-ref="${num}">${num}</span>`;
    });

    const lines = html.split('\n');
    const processedLines = [];
    
    let currentCallout = null;
    let currentRecall = null;
    let inList = false;

    function flushCallout() {
        if (currentCallout) {
            const bodyContent = parseMarkdownInline(currentCallout.lines.join('<br>'), nodeColor);
            let icon = 'ℹ️';
            if (currentCallout.type === 'tip') icon = '💡';
            else if (currentCallout.type === 'important') icon = '📌';
            else if (currentCallout.type === 'warning') icon = '⚠️';
            else if (currentCallout.type === 'caution') icon = '🚨';
            
            processedLines.push(`
                <div class="callout ${currentCallout.type}">
                    <div class="callout-icon">${icon}</div>
                    <div class="callout-body"><p>${bodyContent}</p></div>
                </div>
            `);
            currentCallout = null;
        }
    }

    function flushRecall() {
        if (currentRecall) {
            const ansContent = parseMarkdownInline(currentRecall.answerLines.join('<br>'), nodeColor);
            processedLines.push(`
                <div class="recall-card">
                    <div class="recall-question">
                        <div>
                            <span class="q-icon">❓</span>
                            <span>${currentRecall.question}</span>
                        </div>
                        <span class="reveal-indicator">Revelar</span>
                    </div>
                    <div class="recall-answer">${ansContent}</div>
                </div>
            `);
            currentRecall = null;
        }
    }

    function flushList() {
        if (inList) {
            processedLines.push('</ul>');
            inList = false;
        }
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Active Recall Question P: or Q:
        const recallQMatch = line.match(/^\s*(?:P|Q):\s*(.*)$/i);
        if (recallQMatch) {
            flushCallout();
            flushRecall();
            flushList();
            currentRecall = { question: recallQMatch[1], answerLines: [] };
            continue;
        }

        // Active Recall Answer R: or A:
        const recallAMatch = line.match(/^\s*(?:R|A):\s*(.*)$/i);
        if (recallAMatch) {
            if (currentRecall) {
                currentRecall.answerLines.push(recallAMatch[1]);
            } else {
                processedLines.push(`<p>${parseMarkdownInline(line, nodeColor)}</p>`);
            }
            continue;
        }

        if (currentRecall && trimmed !== "" && !line.match(/^\s*&gt;/)) {
            currentRecall.answerLines.push(line);
            continue;
        } else if (currentRecall && trimmed === "") {
            flushRecall();
            continue;
        }

        // Blockquotes & Callouts starting with &gt;
        const bqMatch = line.match(/^\s*&gt;\s*(.*)$/);
        if (bqMatch) {
            flushRecall();
            flushList();
            
            const bqContent = bqMatch[1];
            const calloutHeaderMatch = bqContent.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
            
            if (calloutHeaderMatch) {
                flushCallout();
                const type = calloutHeaderMatch[1].toLowerCase();
                const rest = bqContent.substring(calloutHeaderMatch[0].length).trim();
                currentCallout = { type, lines: [rest] };
            } else {
                if (currentCallout) {
                    currentCallout.lines.push(bqContent);
                } else {
                    currentCallout = { type: 'note', lines: [bqContent] };
                }
            }
            continue;
        } else {
            flushCallout();
        }

        // Lists
        const listMatch = line.match(/^\s*[-*]\s+(.*)$/);
        if (listMatch) {
            flushRecall();
            if (!inList) {
                processedLines.push('<ul>');
                inList = true;
            }
            processedLines.push(`<li>${parseMarkdownInline(listMatch[1], nodeColor)}</li>`);
            continue;
        } else {
            flushList();
        }

        // Headers
        const h3Match = line.match(/^###\s+(.*)$/);
        if (h3Match) {
            processedLines.push(`<h3>${parseMarkdownInline(h3Match[1], nodeColor)}</h3>`);
            continue;
        }
        const h2Match = line.match(/^##\s+(.*)$/);
        if (h2Match) {
            processedLines.push(`<h2>${parseMarkdownInline(h2Match[1], nodeColor)}</h2>`);
            continue;
        }
        const h1Match = line.match(/^#\s+(.*)$/);
        if (h1Match) {
            processedLines.push(`<h1>${parseMarkdownInline(h1Match[1], nodeColor)}</h1>`);
            continue;
        }

        // Paragraph
        if (trimmed === "") {
            processedLines.push("<br>");
        } else {
            // Check if it's just code placeholder
            if (trimmed.startsWith('\uFFFCcode') || trimmed.startsWith('\uFFFCchart')) {
                processedLines.push(trimmed);
            } else {
                processedLines.push(`<p>${parseMarkdownInline(line, nodeColor)}</p>`);
            }
        }
    }

    flushCallout();
    flushRecall();
    flushList();

    html = processedLines.join('\n');

    // Restore charts
    html = html.replace(/\uFFFCchart(\d+)\uFFFC/g, (match, index) => {
        return charts[Number(index)] || "";
    });

    // Restore code blocks
    html = html.replace(/\uFFFCcode(\d+)\uFFFC/g, (match, index) => {
        const code = codeBlocks[Number(index)] || "";
        return `<pre><code>${code}</code></pre>`;
    });

    // Restore display math blocks
    html = html.replace(/\uFFFCdisplayMath(\d+)\uFFFC/g, (match, index) => {
        const math = displayMath[Number(index)] || "";
        const escaped = math.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `<div class="math-block">$$${escaped}$$</div>`;
    });

    // Restore inline math blocks
    html = html.replace(/\uFFFCinlineMath(\d+)\uFFFC/g, (match, index) => {
        const math = inlineMath[Number(index)] || "";
        const escaped = math.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `<span class="math-inline">$${escaped}$</span>`;
    });

    // Append footnotes
    if (Object.keys(footnotes).length > 0) {
        let refSection = `<div class="reference-section"><h4>Referencias</h4>`;
        for (const num of Object.keys(footnotes).sort((a, b) => Number(a) - Number(b))) {
            const parsedRef = parseMarkdownInline(footnotes[num], nodeColor);
            refSection += `<div class="reference-item"><strong>[${num}]</strong> ${parsedRef}</div>`;
        }
        refSection += `</div>`;
        html += refSection;
    }

    return html;
}
