import { App, BasesEntry, MarkdownView, WorkspaceLeaf } from "obsidian";
import React, { useCallback, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useApp } from "./hooks";

export const FeedReactView: React.FC<FeedReactViewProps> = ({
  entries,
  onEntryClick,
  onEntryContextMenu,
  scrollElement,
}) => {
  const app = useApp();
  const getScrollEl = useMemo(() => () => scrollElement, [scrollElement]);

  const rowVirtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: getScrollEl,
    estimateSize: () => 280, // rough average height; real size will be measured
    overscan: 8,
    measureElement: (el: Element | null) =>
      (el as HTMLElement | null)?.getBoundingClientRect().height ?? 0,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div className="bases-feed">
      {entries.length === 0 ? (
        <div className="bases-feed-empty">No notes to display</div>
      ) : (
        // The container must be position:relative; items are absolutely positioned.
        <div
          className="bases-feed-virtualizer"
          style={{ height: rowVirtualizer.getTotalSize() }}
        >
          {virtualItems.map(
            (vi: ReturnType<typeof rowVirtualizer.getVirtualItems>[number]) => {
              const entry = entries[vi.index];
              return (
                <div
                  key={vi.key}
                  data-index={vi.index}
                  ref={rowVirtualizer.measureElement}
                  className="bases-feed-virtual-item"
                  style={{ transform: `translateY(${vi.start}px)` }}
                >
                  <FeedEntry
                    entry={entry}
                    app={app}
                    onEntryClick={onEntryClick}
                    onEntryContextMenu={onEntryContextMenu}
                  />
                </div>
              );
            },
          )}
        </div>
      )}
    </div>
  );
};

const FeedEntry: React.FC<FeedEntryProps> = ({
  entry,
  app,
  onEntryClick,
  onEntryContextMenu,
}) => {
  const handleTitleClick = (evt: React.MouseEvent) => {
    evt.preventDefault();
    const isModEvent = evt.ctrlKey || evt.metaKey;
    onEntryClick(entry, isModEvent);
  };

  const handleContextMenu = (evt: React.MouseEvent) => {
    onEntryContextMenu(evt, entry);
  };

  const handleHover = (evt: React.MouseEvent) => {
    if (app) {
      app.workspace.trigger("hover-link", {
        event: evt.nativeEvent,
        source: "bases",
        hoverParent: app.renderContext,
        targetEl: evt.currentTarget,
        linktext: entry.file.path,
      });
    }
  };

  const setEditorHost = useCallback(
    (node: HTMLDivElement) => {
      let alive = true;
      // @ts-ignore using internal API
      const leaf = new WorkspaceLeaf(app);
      (async () => {
        try {
          await leaf.openFile(entry.file, {
            state: { mode: "source", source: false },
          });
          if (!alive) return;

          const view = leaf.view;
          if (!(view instanceof MarkdownView)) {
            node.replaceChildren();
            const err = node.createDiv("bases-feed-error");
            err.setText("Failed to load markdown editor");
            try {
              leaf.detach();
            } catch {}
            return;
          }

          node.replaceChildren(view.containerEl);
        } catch (e) {
          if (alive) console.error("Error setting up editor:", e);
        }
      })();

      return () => {
        alive = false;
        try {
          node.replaceChildren();
        } catch {}
        try {
          leaf.detach();
        } catch {}
      };
    },
    [app, entry.file],
  );

  return (
    <div className="bases-feed-entry" onContextMenu={handleContextMenu}>
      <div className="bases-feed-entry-header">
        <a
          className="bases-feed-entry-title"
          onClick={handleTitleClick}
          onMouseEnter={handleHover}
          href="#"
        >
          {entry.file.basename}
        </a>
      </div>

      <div className="bases-feed-entry-content">
        <div ref={setEditorHost} className="bases-feed-entry-editor" />
      </div>
    </div>
  );
};

// Props

type FeedReactViewProps = {
  entries: BasesEntry[];
  onEntryClick: (entry: BasesEntry, isModEvent: boolean) => void;
  onEntryContextMenu: (evt: React.MouseEvent, entry: BasesEntry) => void;
  scrollElement: HTMLElement;
};

type FeedEntryProps = {
  entry: BasesEntry;
  app: App;
  onEntryClick: (entry: BasesEntry, isModEvent: boolean) => void;
  onEntryContextMenu: (evt: React.MouseEvent, entry: BasesEntry) => void;
};
