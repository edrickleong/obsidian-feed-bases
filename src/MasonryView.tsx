import { App, BasesEntry, MarkdownView, WorkspaceLeaf } from "obsidian";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useApp } from "./hooks";

export const MasonryView: React.FC<MasonryViewProps> = ({
  entries,
  onEntryClick,
  onEntryContextMenu,
  scrollElement,
  showProperties,
  maxCardWidth,
}) => {
  const app = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [columnCount, setColumnCount] = useState(1);

  // Track container width for responsive column calculation
  useEffect(() => {
    if (!containerRef.current) return;

    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setContainerWidth(width);

        // Calculate column count based on container width and max card width
        // Account for gaps between columns (16px per gap)
        const gapSize = 16;
        const availableWidth = width - gapSize * 2; // padding on sides
        const cols = Math.max(
          1,
          Math.floor((availableWidth + gapSize) / (maxCardWidth + gapSize)),
        );
        setColumnCount(cols);
      }
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [maxCardWidth]);

  // Distribute entries across columns
  const columns = useMemo(() => {
    const cols: BasesEntry[][] = Array.from({ length: columnCount }, () => []);

    // Distribute entries evenly across columns (round-robin)
    entries.forEach((entry, index) => {
      cols[index % columnCount].push(entry);
    });

    return cols;
  }, [entries, columnCount]);

  return (
    <div ref={containerRef} className="bases-feed bases-feed-masonry">
      {entries.length === 0 ? (
        <div className="bases-feed-empty">No notes to display</div>
      ) : (
        <div
          className="bases-feed-masonry-grid"
          style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}
        >
          {columns.map((columnEntries, columnIndex) => (
            <MasonryColumn
              key={columnIndex}
              entries={columnEntries}
              scrollElement={scrollElement}
              app={app}
              showProperties={showProperties}
              onEntryClick={onEntryClick}
              onEntryContextMenu={onEntryContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const MasonryColumn: React.FC<MasonryColumnProps> = ({
  entries,
  scrollElement,
  app,
  showProperties,
  onEntryClick,
  onEntryContextMenu,
}) => {
  const getScrollEl = useMemo(() => () => scrollElement, [scrollElement]);

  const rowVirtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: getScrollEl,
    estimateSize: () => 280,
    overscan: 5,
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
        // @ts-ignore - accessing private property for performance fix
        let cacheMeasurement = instance.itemSizeCache.get(indexKey);
        return cacheMeasurement ?? 0;
      }
    },
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div className="bases-feed-masonry-column">
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

type MasonryViewProps = {
  entries: BasesEntry[];
  onEntryClick: (entry: BasesEntry, isModEvent: boolean) => void;
  onEntryContextMenu: (evt: React.MouseEvent, entry: BasesEntry) => void;
  scrollElement: HTMLElement;
  showProperties: boolean;
  maxCardWidth: number;
};

type MasonryColumnProps = {
  entries: BasesEntry[];
  scrollElement: HTMLElement;
  app: App;
  showProperties: boolean;
  onEntryClick: (entry: BasesEntry, isModEvent: boolean) => void;
  onEntryContextMenu: (evt: React.MouseEvent, entry: BasesEntry) => void;
};

type FeedEntryProps = {
  entry: BasesEntry;
  app: App;
  showProperties: boolean;
  onEntryClick: (entry: BasesEntry, isModEvent: boolean) => void;
  onEntryContextMenu: (evt: React.MouseEvent, entry: BasesEntry) => void;
};
