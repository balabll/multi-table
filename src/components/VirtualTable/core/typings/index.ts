import Konva from "konva";

export type Column = {
  title: string;
  width: number;
  lock?: boolean;
};

export type Groups = {
  topLeft: Konva.Group;
  topRight: Konva.Group;
  bottomLeft: Konva.Group;
  bottomRight: Konva.Group;
};

export type TableDataSource = string[][];

export type Range = { start: number; end: number };
