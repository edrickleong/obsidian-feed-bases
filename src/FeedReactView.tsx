import { App, BasesEntry, MarkdownView, WorkspaceLeaf } from "obsidian";
import React, { useCallback, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useApp } from "./hooks";
import { MasonryView } from "./MasonryView";

export const FeedReactView: React.FC<FeedReactViewProps> = ({
  entries,
  onEntryClick,
  onEntryContextMenu,
  scrollElement,
  showProperties,
  multipleColumns = false,
  maxCardWidth = 400,
}) => {
  // Conditionally render masonry or single column view
  if (multipleColumns) {
    return (
      <MasonryView
        entries={entries}
        onEntryClick={onEntryClick}
        onEntryContextMenu={onEntryContextMenu}
        scrollElement={scrollElement}
        showProperties={showProperties}
        maxCardWidth={maxCardWidth}
      />
    );
  }

  // Single column centered view
  return (
    <SingleColumnView
      entries={entries}
      onEntryClick={onEntryClick}
      onEntryContextMenu={onEntryContextMenu}
      scrollElement={scrollElement}
      showProperties={showProperties}
      maxCardWidth={maxCardWidth}
    />
  );
};

const SingleColumnView: React.FC<SingleColumnViewProps> = ({
  entries,
  onEntryClick,
  onEntryContextMenu,
  scrollElement,
  showProperties,
  maxCardWidth,
}) => {
  const app = useApp();
  const getScrollEl = useMemo(() => () => scrollElement, [scrollElement]);

  const rowVirtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: getScrollEl,
    estimateSize: () => 280,
    overscan: 8,
    measureElement: (element, entry, instance) => {
      const direction = instance.scrollDirection;
      if (direction === "forward" || direction === null) {
        return (
          (element as HTMLElement | null)?.getBoundingClientRect().height ?? 0
        );
      } else {
        // Don't remeasure if we are scrolling up to prevent stuttering
        const indexKey = Number(
          (element as HTMLElement).getAttribute("data-index"),
        );
        // @ts-ignore - accessing private property for performance fix (see https://github.com/TanStack/virtual/issues/659)
        const cacheMeasurement = instance.itemSizeCache.get(indexKey);
        return cacheMeasurement ?? 0;
      }
    },
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div
      className="bases-feed bases-feed-single-column"
      style={{ maxWidth: `${maxCardWidth}px` }}
    >
      {entries.length === 0 ? (
        <div className="bases-feed-empty">No notes to display</div>
      ) : (
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
                  style={{
                    transform: `translateY(${vi.start}px)`,
                  }}
                >
                  <FeedEntry
                    entry={entry}
                    app={app}
                    showProperties={showProperties}
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
  showProperties,
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
      void (async () => {
        try {
          await leaf.openFile(entry.file, {
            state: { mode: "source", source: false },
          });
          if (!alive) return;

          const view = leaf.view;
          if (!(view instanceof MarkdownView)) {
            node.replaceChildren();
            const err = node.createDiv("bases-feed-error");
            err.setText("Failed to load Markdown editor");
            return;
          }

          node.replaceChildren(view.containerEl);
        } catch (e) {
          if (alive) console.error("Error setting up editor:", e);
        }
      })();

      return () => {
        alive = false;
        node.replaceChildren();
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
        <div
          ref={setEditorHost}
          className="bases-feed-entry-editor"
          style={
            {
              "--metadata-display-editing": showProperties ? "block" : "none",
            } as React.CSSProperties
          }
        />
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
  showProperties: boolean;
  multipleColumns?: boolean;
  maxCardWidth?: number;
};

type SingleColumnViewProps = {
  entries: BasesEntry[];
  onEntryClick: (entry: BasesEntry, isModEvent: boolean) => void;
  onEntryContextMenu: (evt: React.MouseEvent, entry: BasesEntry) => void;
  scrollElement: HTMLElement;
  showProperties: boolean;
  maxCardWidth: number;
};

type FeedEntryProps = {
  entry: BasesEntry;
  app: App;
  showProperties: boolean;
  onEntryClick: (entry: BasesEntry, isModEvent: boolean) => void;
  onEntryContextMenu: (evt: React.MouseEvent, entry: BasesEntry) => void;
};
