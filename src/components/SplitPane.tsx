import { useState, useRef, useCallback, useEffect } from 'react';

export type SplitDirection = 'horizontal' | 'vertical';

export interface SplitNode {
  id: string;
  sessionId: string;
  direction?: SplitDirection;
  children?: [SplitNode, SplitNode];
  size?: number;
}

interface SplitPaneProps {
  node: SplitNode;
  onSplit: (id: string, direction: SplitDirection) => void;
  onClose: (id: string) => void;
  renderTerminal: (sessionId: string, nodeId: string) => React.ReactNode;
}

export default function SplitPane({ node, onSplit, onClose, renderTerminal }: SplitPaneProps) {
  if (!node.children) {
    return (
      <div className="split-pane-leaf">
        <div className="split-pane-actions">
          <button className="split-btn" onClick={() => onSplit(node.id, 'horizontal')} title="Split horizontally">\u2194</button>
          <button className="split-btn" onClick={() => onSplit(node.id, 'vertical')} title="Split vertically">\u2195</button>
          <button className="split-btn close-btn" onClick={() => onClose(node.id)} title="Close pane">&times;</button>
        </div>
        <div className="split-pane-terminal">
          {renderTerminal(node.sessionId, node.id)}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`split-pane split-${node.direction || 'horizontal'}`}
    >
      <SplitPane
        node={node.children[0]}
        onSplit={onSplit}
        onClose={onClose}
        renderTerminal={renderTerminal}
      />
      <div className="split-divider" />
      <SplitPane
        node={node.children[1]}
        onSplit={onSplit}
        onClose={onClose}
        renderTerminal={renderTerminal}
      />
    </div>
  );
}

let splitIdCounter = 0;
export function createSplitId(): string {
  return `split-${++splitIdCounter}`;
}

export function createLeafNode(sessionId: string): SplitNode {
  return { id: createSplitId(), sessionId };
}
