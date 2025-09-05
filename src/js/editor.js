// 编辑器功能模块
// 处理思维导图节点的编辑、删除等操作

/**
 * 打开编辑节点模态框
 */
function openEditModal(originalText, lineIndex, prefix) {
    editingNodeContext = { lineIndex, prefix };
    const editInput = document.getElementById('edit-node-input');
    editInput.value = originalText;
    editNodeModal.classList.remove('hidden');
    editInput.focus();
    editInput.select();
}

/**
 * 关闭编辑节点模态框
 */
function closeEditModal() {
    editingNodeContext = null;
    editNodeModal.classList.add('hidden');
}

/**
 * 保存节点编辑
 */
function saveNodeEdit() {
    if (!editingNodeContext) return;

    const newText = document.getElementById('edit-node-input').value;
    const { lineIndex, prefix } = editingNodeContext;
    const newLine = prefix + newText;
    
    const lines = currentMarkdown.split('\n');
    if (lines[lineIndex] !== undefined) {
        lines[lineIndex] = newLine;
        currentMarkdown = lines.join('\n');
    }

    if (activeResultIndex > -1 && aiResults[activeResultIndex]) {
        aiResults[activeResultIndex].markdown = currentMarkdown;
        try {
            const { root } = transformer.transform(currentMarkdown);
            aiResults[activeResultIndex].root = root;
        } catch (error) {
            console.error('Error parsing edited markdown after node edit:', error);
        }
    }
    
    if (currentViewMode === 'markdown') {
        contentDisplay.value = currentMarkdown;
    }

    updateMarkmap(currentMarkdown);
    closeEditModal();
}

/**
 * 收集节点相关的所有行号
 */
function collectNodeLines(node, linesSet) {
    const markmapNode = node.data; 
    if (markmapNode?.payload?.lines) {
        const [start, end] = markmapNode.payload.lines;
        for (let i = start; i < end; i++) {
            linesSet.add(i);
        }
    }
    if (node.children) {
        for (const child of node.children) {
            collectNodeLines(child, linesSet);
        }
    }
}

/**
 * 删除指定节点
 */
function deleteNode(nodeToDelete) {
    if (!nodeToDelete) return;

    const linesToDelete = new Set();
    collectNodeLines(nodeToDelete, linesToDelete);

    if (linesToDelete.size === 0) {
        console.warn("Could not find line numbers for node deletion.", nodeToDelete);
        return;
    }
    
    const lines = currentMarkdown.split('\n');
    const newLines = lines.filter((_, i) => !linesToDelete.has(i));
    currentMarkdown = newLines.join('\n');

    if (activeResultIndex > -1 && aiResults[activeResultIndex]) {
        aiResults[activeResultIndex].markdown = currentMarkdown;
        try {
            const { root } = transformer.transform(currentMarkdown);
            aiResults[activeResultIndex].root = root;
        } catch (error) {
            console.error('Error parsing markdown after node deletion:', error);
        }
    }
    
    if (currentViewMode === 'markdown') {
        contentDisplay.value = currentMarkdown;
    }

    updateMarkmap(currentMarkdown);
}

/**
 * 移除上下文菜单
 */
function removeContextMenu() {
    const existingMenu = document.getElementById('node-context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
}

/**
 * 创建上下文菜单
 */
function createContextMenu(event, nodeData) {
    const { pageX, pageY } = event;

    const lines = currentMarkdown.split('\n');
    const lineIndex = nodeData.data?.payload?.lines?.[0];
    if (lineIndex === undefined || lines[lineIndex] === undefined) {
        console.error("Invalid node data for context menu:", nodeData);
        return;
    }
    const fullLine = lines[lineIndex];

    const menu = document.createElement('div');
    menu.id = 'node-context-menu';
    menu.className = 'context-menu';
    menu.addEventListener('contextmenu', e => e.preventDefault());

    const editItem = document.createElement('div');
    editItem.className = 'context-menu-item';
    editItem.innerHTML = T('editNodeTitle');
    editItem.onclick = (e) => {
        e.stopPropagation();
        removeContextMenu();
        
        const match = fullLine.match(/^(\s*(?:#+\s*|-\s*|\d+\.\s*))/);
        const prefix = match ? match[0] : '';
        const originalText = nodeData.data.content;

        openEditModal(originalText, lineIndex, prefix);
    };
    menu.appendChild(editItem);

    const deleteItem = document.createElement('div');
    deleteItem.className = 'context-menu-item';
    deleteItem.innerHTML = T('deleteNodeBtn');
    deleteItem.onclick = (e) => {
        e.stopPropagation();
        deleteNode(nodeData);
        removeContextMenu();
    };
    menu.appendChild(deleteItem);

    document.body.appendChild(menu);

    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const { innerWidth, innerHeight } = window;
    
    let left = pageX;
    let top = pageY;

    if (pageX + menuWidth > innerWidth) {
        left = innerWidth - menuWidth - 5;
    }
    if (pageY + menuHeight > innerHeight) {
        top = innerHeight - menuHeight - 5;
    }

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
}

/**
 * 设置节点交互（右键菜单）
 */
function setupNodeInteraction() {
    if (!mm || !d3) return;

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.context-menu')) {
            removeContextMenu();
        }
    });

    mm.svg.on('contextmenu.editor', (event) => {
        event.preventDefault();
        event.stopPropagation();
        removeContextMenu();
        
        const node = event.target.closest('.markmap-node');
        if (!node) return;

        const d = d3.select(node).datum();
        if (!d?.data?.payload?.lines) return;
        
        createContextMenu(event, d);
    });
}