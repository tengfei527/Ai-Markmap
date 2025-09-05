// 导出功能模块
// 处理SVG和PNG格式的思维导图导出

/**
 * 获取思维导图相关的CSS规则
 */
function getMindmapCssRules() {
    let cssText = '';
    const relevantSelectors = ['.markmap', 'text', 'path', 'line', 'circle', 'foreignObject'];
    for (const styleSheet of document.styleSheets) {
        try {
            if (styleSheet.cssRules) {
                for (const rule of styleSheet.cssRules) {
                    if (relevantSelectors.some(selector => rule.selectorText?.includes(selector))) {
                        cssText += rule.cssText;
                    }
                }
            }
        } catch (e) {
            console.warn("无法读取样式表中的CSS规则:", styleSheet.href, e);
        }
    }
    return cssText;
}

/**
 * 创建可导出的SVG元素
 */
function createExportableSvg(svgElement) {
    const mainGroup = svgElement.querySelector('g');
    if (!mainGroup) return null;

    const bbox = mainGroup.getBBox();
    if (bbox.width === 0 || bbox.height === 0) return null;
    
    const svgClone = svgElement.cloneNode(true);
    
    svgClone.removeAttribute('style');
    
    svgClone.setAttribute('width', bbox.width);
    svgClone.setAttribute('height', bbox.height);
    svgClone.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
    
    const groupInClone = svgClone.querySelector('g');
    if(groupInClone) {
        groupInClone.removeAttribute('transform');
    }

    const style = document.createElement('style');
    style.textContent = getMindmapCssRules();
    svgClone.insertBefore(style, svgClone.firstChild);

    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgClone);

    svgString = svgString.replace(/(\w+)?:?xlink=/g, 'xmlns:xlink=').replace(/NS\d+:href/g, 'xlink:href');

    return { svgString, width: bbox.width, height: bbox.height };
}

/**
 * 下载Blob文件
 */
function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * 导出SVG格式的思维导图
 */
async function exportSVG() {
    const exportBtn = document.getElementById('export-svg-btn');
    if (exportBtn.disabled) return;

    const mindmapSVG = document.querySelector('#mindmap');
    if (!mindmapSVG) {
        alert(T('js_alert_no_mindmap'));
        return;
    }
    
    const originalText = exportBtn.textContent;
    exportBtn.disabled = true;
    exportBtn.textContent = T('js_exporting');

    try {
        await mm.fit();
        const svgData = createExportableSvg(mindmapSVG);

        if (!svgData) {
            throw new Error(T('js_alert_no_mindmap'));
        }

        const svgBlob = new Blob([svgData.svgString], { type: 'image/svg+xml;charset=utf-8' });
        downloadBlob(svgBlob, `aimarkmap-${Date.now()}.svg`);

    } catch (error) {
        console.error('导出SVG失败:', error);
        alert(T('js_alert_export_error', 'SVG'));
    } finally {
        exportBtn.disabled = false;
        exportBtn.textContent = originalText;
    }
}

/**
 * 导出PNG格式的思维导图
 */
async function exportPNG() {
    const exportBtn = document.getElementById('export-png-btn');
    if (exportBtn.disabled) return;

    const mindmapSVG = document.querySelector('#mindmap');
    if (!mindmapSVG) {
        alert(T('js_alert_no_mindmap'));
        return;
    }

    const originalText = exportBtn.textContent;
    exportBtn.disabled = true;
    exportBtn.textContent = T('js_exporting');

    try {
        await mm.fit();
        const svgData = createExportableSvg(mindmapSVG);
        
        if (!svgData) {
            throw new Error(T('js_alert_no_mindmap'));
        }

        const margin = 20;
        const scale = 3; 
        const canvas = document.createElement('canvas');
        canvas.width = (svgData.width + margin * 2) * scale;
        canvas.height = (svgData.height + margin * 2) * scale;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('无法获取Canvas上下文');
        
        ctx.imageSmoothingEnabled = false;

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData.svgString)));
        
        const img = await new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = (err) => reject(new Error('Failed to load SVG as image. ' + err));
            image.src = dataUrl;
        });
        
        if(img.decode) await img.decode();
        
        ctx.drawImage(img, margin * scale, margin * scale, svgData.width * scale, svgData.height * scale);

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

        if (blob) {
            downloadBlob(blob, `aimarkmap-${Date.now()}.png`);
        } else {
            throw new Error("Canvas toBlob failed.");
        }

    } catch (error) {
        console.error('导出PNG时发生意外错误:', error);
        alert(T('js_alert_export_error', 'PNG'));
    } finally {
        exportBtn.disabled = false;
        exportBtn.textContent = originalText;
    }
}