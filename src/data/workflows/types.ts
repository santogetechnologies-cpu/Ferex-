// Shapes shared by the generated inventory (what the code contains) and the curated diagrams (how it fits together).

export interface InvButton { text: string; action: string; type: string }
export interface InvLink { text: string; to: string }
export interface InvField { label: string; type: string; options: string[] }
export interface InvPage {
  path: string; title: string; component: string; file: string; layout: string | null; roles: string[];
  props: Record<string, string>; menu?: string; menuOrder?: number;
  headings: string[]; buttons: InvButton[]; links: InvLink[]; fields: InvField[]; columns: string[];
  tables: string[]; rpcs: string[]; functions: string[]; sources: string[];
}
export interface InvApp {
  name: string;
  roles: { role: string; screens: number }[];
  layouts: string[];
  menus: { layout: string; items: { name: string; path: string }[] }[];
  pages: InvPage[];
  redirects: { from: string; to: string }[];
  totals: { screens: number; buttons: number; fields: number; links: number; tables: number };
}
export interface Inventory { generated_by: string; apps: Record<AppKey, InvApp> }
export type AppKey = 'education' | 'rimi' | 'trade' | 'digital';

export type NodeKind = 'start' | 'step' | 'decision' | 'end' | 'system';
export interface FlowLane { id: string; label: string; roles: string[] }
export interface FlowNode {
  id: string; label: string; lane: string; col: number; kind?: NodeKind; desc: string;
  /** Screens (route paths) where this step happens; their real buttons and fields are shown from the inventory. */
  screens?: string[]; tables?: string[]; functions?: string[];
}
export interface FlowEdge { from: string; to: string; label?: string }
export interface Flowchart { id: string; title: string; summary: string; lanes: FlowLane[]; nodes: FlowNode[]; edges: FlowEdge[] }

export type DfdKind = 'actor' | 'process' | 'store' | 'external';
export interface DfdNode { id: string; kind: DfdKind; label: string; col: number; row: number; desc: string; tables?: string[]; screens?: string[] }
export interface DataFlow { nodes: DfdNode[]; edges: { from: string; to: string; label: string }[] }

export interface AppCurated {
  tagline: string;
  /** What each role is for, in plain words. Roles not listed here still appear, from the code. */
  roleNotes: Record<string, string>;
  flows: Flowchart[];
  dfd: DataFlow;
}
