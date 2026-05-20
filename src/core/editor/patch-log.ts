import { Document, type PatchOperation } from './document';

export class PatchLog {
  private operations: PatchOperation[] = [];

  get all(): readonly PatchOperation[] {
    return this.operations;
  }

  get applied(): readonly PatchOperation[] {
    return this.operations.filter(op => op.status === 'applied');
  }

  push(op: PatchOperation): void {
    this.operations.push(op);
  }

  find(id: string): PatchOperation | undefined {
    return this.operations.find(op => op.id === id);
  }

  /** Mark an operation as reverted. Returns the reverted operation or undefined. */
  revert(id: string): PatchOperation | undefined {
    const op = this.operations.find(o => o.id === id);
    if (op && op.status === 'applied') {
      op.status = 'reverted';
      return op;
    }
    return undefined;
  }

  /** Build the document state after applying only `applied` operations to the original. */
  buildDocument(originalContent: string): Document {
    let doc = new Document(originalContent);
    for (const op of this.operations) {
      if (op.status !== 'applied') continue;
      const patch = {
        id: op.id,
        range: op.originalRange,
        newContent: op.newLines.join('\n'),
        source: op.source,
      };
      doc = doc.applyPatch(patch).document;
    }
    return doc;
  }

  /** Build document state BEFORE a given operation was applied. */
  buildDocumentBefore(opId: string, originalContent: string): Document | null {
    let doc = new Document(originalContent);
    for (const op of this.operations) {
      if (op.id === opId) return doc;
      if (op.status !== 'applied') continue;
      doc = doc.applyPatch({
        range: op.originalRange,
        newContent: op.newLines.join('\n'),
        source: op.source,
      }).document;
    }
    return null;
  }

  clear(): void {
    this.operations.length = 0;
  }
}
