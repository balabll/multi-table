import Konva from "konva";
import { ROW_HEIGHT } from "../../constants";

interface CellConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  value: string;
}

class CellRenderer {
  x: number;
  y: number;
  width: number;
  height: number;
  value: string;
  group: Konva.Group;
  rect: Konva.Rect;
  text: Konva.Text;

  constructor(config: CellConfig) {
    const { x, y, width, height, value } = config;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.value = value;

    this.group = new Konva.Group({
      x,
      y,
    });

    // 创建背景矩形
    this.rect = new Konva.Rect({
      x: 0,
      y: 0,
      width: width,
      height: ROW_HEIGHT,
      fill: "#FFF",
      stroke: "#ccc",
      strokeWidth: 1,
    });

    // 创建文本
    this.text = new Konva.Text({
      x: 8,
      y: 8,
      width: width - 16,
      height: 16,
      text: value,
      fontSize: 14,
      fill: "#000",
      align: "left",
      verticalAlign: "middle",
      ellipsis: true,
    });
    this.group.add(this.rect, this.text);
  }

  render() {
    return this.group;
  }
}

export default CellRenderer;
