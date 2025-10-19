import { Plugin } from "obsidian";
import { FeedView, FeedViewType } from "./feed-view";

export default class ObsidianFeedPlugin extends Plugin {
  async onload() {
    this.registerBasesView(FeedViewType, {
      name: "Feed",
      icon: "lucide-newspaper",
      factory: (controller, containerEl) =>
        new FeedView(controller, containerEl),
    });
  }

  onunload() {}
}
