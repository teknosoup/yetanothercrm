export type PluginMenuItem = {
  label: string;
  href: string;
};

export type PluginWidget = {
  title: string;
  body: string;
};

export type PluginTab = {
  label: string;
  content: string;
};

export type PluginAction = {
  label: string;
  href: string;
};

export type WebPluginDefinition = {
  key: string;
  displayName: string;
  menuItems?: PluginMenuItem[];
  widgets?: PluginWidget[];
  tabs?: PluginTab[];
  actions?: PluginAction[];
};

const registry: Record<string, WebPluginDefinition> = {};

export function getWebPlugin(key: string) {
  return registry[key] ?? null;
}

export function listWebPlugins() {
  return Object.values(registry);
}

