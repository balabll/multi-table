import Konva from "konva";
import { Group } from "konva/lib/Group";
import { Layer } from "konva/lib/Layer";
import { Stage } from "konva/lib/Stage";

export type Column = {
  title: string;
  width: number;
};

type TableDataSource = string[][];

type VirtualTableConfig = {
  container: HTMLDivElement;
  columns: Column[];
  dataSource: TableDataSource;
};

type Range = { start: number; end: number };

const ROW_HEIGHT = 32;

class VirtualTable {
  // =========== 表格基础属性 ===========
  rows: number = 0;
  cols: number = 0;
  columns: Column[];
  stage: Stage;
  layer: any;
  //cellsGroup: Group;
  dataSource: TableDataSource;

  // =========== 虚拟表格实现 ===========
  // 滚动相关属性
  scrollTop: number = 0;
  scrollLeft: number = 0;
  maxScrollTop: number = 0;
  maxScrollLeft: number = 0;
  visibleRowCount: number = 0;
  // 可见行列范围
  visibleRows: Range = { start: 0, end: 0 };
  visibleCols: Range = { start: 0, end: 0 };
  // 表格可见宽高
  visibleWidth: number;
  visibleHeight: number;

  constructor(config: VirtualTableConfig) {
    const { container, columns, dataSource } = config;
    this.columns = columns;
    this.dataSource = dataSource;
    this.visibleWidth = container.getBoundingClientRect().width;
    this.visibleHeight = container.getBoundingClientRect().height;
    this.visibleRowCount = Math.ceil(this.visibleHeight / ROW_HEIGHT);
    this.rows = dataSource.length + 1;
    this.cols = columns.length;
    this.maxScrollTop = Math.max(
      0,
      (this.rows - this.visibleRowCount) * ROW_HEIGHT
    );

    // 计算总列宽
    const totalColWidth = this.columns.reduce((sum, col) => sum + col.width, 0);
    this.maxScrollLeft = Math.max(0, totalColWidth - this.visibleWidth);

    this.stage = new Konva.Stage({
      container,
      height: this.visibleHeight,
      width: this.visibleWidth,
    });
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);

    // 监听滚动事件
    this.bindScrollEvent(container);
    // 初始化调用
    this.updateVisibleRange();
    this.renderCells();
  }

  // 计算可见行列范围
  updateVisibleRange() {
    // 计算可见行
    const startRow = Math.floor(this.scrollTop / ROW_HEIGHT);
    const endRow = Math.min(
      startRow + this.visibleRowCount,
      this.dataSource.length
    );
    this.visibleRows = { start: startRow, end: endRow };

    // 计算可见列
    let accumulatedWidth = 0;
    let startCol = 0;
    let endCol = 0;

    // 计算开始列
    for (let i = 0; i < this.columns.length; i++) {
      const col = this.columns[i];
      if (accumulatedWidth + col.width >= this.scrollLeft) {
        startCol = i;
        break;
      }
      accumulatedWidth += col.width;
    }

    // 计算结束列
    accumulatedWidth = 0;
    for (let i = startCol; i < this.columns.length; i++) {
      const col = this.columns[i];
      accumulatedWidth += col.width;
      if (accumulatedWidth > this.visibleWidth) {
        endCol = i + 1;
        break;
      }
    }

    this.visibleCols = {
      start: startCol,
      end: Math.min(endCol, this.columns.length),
    };
  }

  /**
   * 获取某行的Y坐标
   */
  getRowY(rowIndex: number): number {
    return rowIndex * ROW_HEIGHT;
  }

  /**
   * 获取某列的X坐标
   */
  getColX(colIndex: number): number {
    let x = 0;
    for (let i = 0; i < colIndex; i++) {
      const col = this.columns[i];
      if (col) {
        x += col.width;
      }
    }
    return x;
  }

  renderCell(rowIndex: number, colIndex: number) {
    const column = this.columns[colIndex];
    if (!column) return;
    // 计算坐标时考虑滚动偏移
    const x = this.getColX(colIndex) - this.scrollLeft;
    const y = this.getRowY(rowIndex) - this.scrollTop;
    // 创建单元格
    const group = new Konva.Group({
      x,
      y,
    });
    const rect = new Konva.Rect({
      x: 0,
      y: 0,
      width: column.width,
      height: ROW_HEIGHT,
      fill: "#FFF",
      stroke: "#ccc",
      strokeWidth: 1,
    });

    // 创建文本
    const text = new Konva.Text({
      x: 8,
      y: 8,
      width: column.width - 16,
      height: 16,
      text: this.dataSource[rowIndex][colIndex],
      fontSize: 14,
      fill: "#000",
      align: "left",
      verticalAlign: "middle",
      ellipsis: true,
    });
    group.add(rect);
    group.add(text);
    this.layer.add(group);
  }

  // 渲染可见范围内的单元格
  renderCells() {
    this.layer.destroyChildren();
    // 渲染数据行
    for (
      let rowIndex = this.visibleRows.start;
      rowIndex <= this.visibleRows.end;
      rowIndex++
    ) {
      for (
        let colIndex = this.visibleCols.start;
        colIndex <= this.visibleCols.end;
        colIndex++
      ) {
        this.renderCell(rowIndex, colIndex);
      }
    }
  }

  /**
   * 绑定滚动事件
   */
  bindScrollEvent(container: HTMLDivElement) {
    container.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.handleScroll(e.deltaX, e.deltaY);
    });

    // 支持触摸滚动
    let lastTouchY = 0;
    let lastTouchX = 0;
    container.addEventListener("touchstart", (e: TouchEvent) => {
      const touch = e.touches?.[0];
      if (touch) {
        lastTouchY = touch.clientY;
        lastTouchX = touch.clientX;
      }
    });

    container.addEventListener("touchmove", (e: TouchEvent) => {
      const touch = e.touches?.[0];
      if (touch) {
        const deltaY = lastTouchY - touch.clientY;
        const deltaX = lastTouchX - touch.clientX;
        this.handleScroll(deltaX, deltaY);
        lastTouchY = touch.clientY;
        lastTouchX = touch.clientX;
      }
    });
  }

  /**
   * 处理滚动
   */
  handleScroll(deltaX: number, deltaY: number) {
    // 更新滚动位置
    this.scrollTop = Math.max(
      0,
      Math.min(this.scrollTop + deltaY, this.maxScrollTop)
    );
    this.scrollLeft = Math.max(
      0,
      Math.min(this.scrollLeft + deltaX, this.maxScrollLeft)
    );

    // 更新可见行列范围
    this.updateVisibleRange();

    // 更新单元格渲染
    this.renderCells();
  }
}

export default VirtualTable;
