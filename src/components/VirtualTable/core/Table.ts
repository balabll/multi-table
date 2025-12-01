import Konva from "konva";
import { Stage } from "konva/lib/Stage";
import { Column, Groups, TableDataSource, Range } from "./typings";
import { CELL_DEFAULT_WIDTH, ROW_HEIGHT } from "./constants";
import CellRenderer from "./components/cell";

type VirtualTableConfig = {
  container: HTMLDivElement;
  columns: Column[];
  dataSource: TableDataSource;
};

class VirtualTable {
  // =========== 表格基础属性 ===========
  rows: number = 0;
  cols: number = 0;
  columns: Column[];
  stage: Stage;
  layer: Konva.Layer;
  dataSource: TableDataSource;
  groups: Groups;

  // 缓存固定行、列信息
  frozenColsWidth: number = 0;
  frozenRowsHeight: number = 0;
  frozenColIndex: number = -1;

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
    this.frozenColIndex = this.columns.findIndex((item) => item.lock);
    this.frozenColsWidth = this.getFrozenColsWidth();
    this.frozenRowsHeight = this.getFrozenRowsHeight();
    this.stage = new Konva.Stage({
      container,
      height: this.visibleHeight,
      width: this.visibleWidth,
    });
    this.layer = new Konva.Layer();
    this.groups = {
      topLeft: new Konva.Group(),
      topRight: new Konva.Group(),
      bottomLeft: new Konva.Group(),
      bottomRight: new Konva.Group(),
    };
    this.stage.add(this.layer);

    // 监听滚动事件
    this.bindScrollEvent(container);
    // 初始化调用
    this.initGroup();
    this.updateVisibleRange();
    this.renderCells();
  }

  initGroup() {
    this.layer.add(this.groups.bottomRight);
    this.layer.add(this.groups.topRight);
    this.layer.add(this.groups.bottomLeft);
    this.layer.add(this.groups.topLeft);
    this.setClipping();
  }

  // 获取冻结列宽
  getFrozenColsWidth() {
    let frozenIndex = this.columns.findIndex((item) => item.lock);
    if (frozenIndex === -1) {
      frozenIndex = 0;
    }

    let frozenColsWidth = 0;
    this.columns
      .filter((_, index) => index <= frozenIndex)
      .forEach((item) => (frozenColsWidth += item.width));

    return frozenColsWidth;
  }

  // 获取冻结行高度
  getFrozenRowsHeight() {
    return ROW_HEIGHT;
  }

  // 获取所有列宽度
  getAllColWidth() {
    let w = 0;
    this.columns.forEach((column) => {
      w += column.width || CELL_DEFAULT_WIDTH;
    });
    return w;
  }

  // 剪裁四个区域
  setClipping() {
    const frozenColsWidth = this.getFrozenColsWidth() + 1;
    const frozenRowsHeight = this.getFrozenRowsHeight();
    const width = this.getAllColWidth();
    const height = this.rows * ROW_HEIGHT;

    // 为每个Group设置裁剪
    this.groups.topLeft.clipFunc((ctx: CanvasRenderingContext2D) => {
      ctx.rect(0, 0, frozenColsWidth, frozenRowsHeight);
    });
    this.groups.topRight.clipFunc((ctx: CanvasRenderingContext2D) => {
      ctx.rect(frozenColsWidth, 0, width - frozenColsWidth, frozenRowsHeight);
    });

    this.groups.bottomLeft.clipFunc((ctx: CanvasRenderingContext2D) => {
      ctx.rect(0, frozenRowsHeight, frozenColsWidth, height - frozenRowsHeight);
    });

    this.groups.bottomRight.clipFunc((ctx: CanvasRenderingContext2D) => {
      ctx.rect(
        frozenColsWidth,
        frozenRowsHeight,
        width - frozenColsWidth,
        height - frozenRowsHeight
      );
    });
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
      if (accumulatedWidth > this.visibleWidth - this.frozenColsWidth) {
        endCol = i + 1;
        break;
      }
    }

    this.visibleCols = {
      start: startCol,
      end: Math.min(endCol + 1, this.columns.length),
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

  /**
   * 判断列是否被冻结
   */
  isColFrozen(colIndex: number): boolean {
    return colIndex <= this.frozenColIndex;
  }

  /**
   * 判断行是否被冻结
   */
  isRowFrozen(rowIndex: number): boolean {
    return rowIndex === 0; // 假设只冻结第一行（表头）
  }

  /**
   * 获取cell应该添加到的group
   */
  getCellGroup(rowIndex: number, colIndex: number): Konva.Group {
    const isFrozenRow = this.isRowFrozen(rowIndex);
    const isFrozenCol = this.isColFrozen(colIndex);

    if (isFrozenRow && isFrozenCol) {
      return this.groups.topLeft;
    } else if (isFrozenRow) {
      return this.groups.topRight;
    } else if (isFrozenCol) {
      return this.groups.bottomLeft;
    } else {
      return this.groups.bottomRight;
    }
  }

  renderCell(rowIndex: number, colIndex: number) {
    const column = this.columns[colIndex];
    if (!column) return;
    // 计算坐标时考虑滚动偏移
    const x = this.getColX(colIndex);
    const y = this.getRowY(rowIndex);
    const cellValue =
      rowIndex === 0 ? column.title : this.dataSource[rowIndex][colIndex];

    // 创建单元格
    const cell = new CellRenderer({
      x,
      y,
      height: ROW_HEIGHT,
      width: column.width,
      value: cellValue,
    });
    const cellGroup = cell.render();
    const isFrozenCol = this.isColFrozen(colIndex);

    // 冻结列设置更高的 zIndex
    if (cellGroup.parent) {
      if (isFrozenCol) {
        cellGroup.zIndex(100);
      } else {
        cellGroup.zIndex(1);
      }
    }

    const group = this.getCellGroup(rowIndex, colIndex);
    group.add(cellGroup);
  }

  // 渲染可见范围内的单元格
  renderCells() {
    this.groups.topLeft.destroyChildren();
    this.groups.topRight.destroyChildren();
    this.groups.bottomLeft.destroyChildren();
    this.groups.bottomRight.destroyChildren();

    // 渲染表头
    for (let colIndex = 0; colIndex < this.columns.length; colIndex++) {
      this.renderCell(0, colIndex);
    }

    // 渲染数据行
    for (
      let rowIndex = this.visibleRows.start;
      rowIndex <= this.visibleRows.end;
      rowIndex++
    ) {
      if (rowIndex === 0) continue; // 跳过已渲染的表头行
      for (
        let colIndex = 0;
        colIndex <= this.frozenColIndex && colIndex < this.columns.length;
        colIndex++
      ) {
        this.renderCell(rowIndex, colIndex);
      }

      // 渲染可见列
      for (
        let colIndex = this.visibleCols.start;
        colIndex <= this.visibleCols.end;
        colIndex++
      ) {
        if (colIndex <= this.frozenColIndex) continue; // 跳过已渲染的冻结列
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
   * 更新各区域的位置和内容
   */
  updateGroups() {
    // 对滚动位置添加边界值校验，避免当滚动到最后一行/列时继续更新位置
    const clampedScrollLeft = Math.max(
      0,
      Math.min(this.scrollLeft, this.maxScrollLeft)
    );
    const clampedScrollTop = Math.max(
      0,
      Math.min(this.scrollTop, this.maxScrollTop)
    );

    // topLeft: 冻结行+冻结列 (不动)
    this.groups.topLeft.offsetX(0);
    this.groups.topLeft.offsetY(0);

    // topRight: 冻结行+滚动列 (水平滚动，使用受限的 scrollLeft)
    this.groups.topRight.offsetX(clampedScrollLeft);
    this.groups.topRight.offsetY(0);

    // bottomLeft: 滚动行+冻结列 (竖直滚动，使用受限的 scrollTop)
    this.groups.bottomLeft.offsetX(0);
    this.groups.bottomLeft.offsetY(clampedScrollTop);

    // bottomRight: 滚动行+滚动列 (同时滚动，使用受限值)
    this.groups.bottomRight.offsetX(clampedScrollLeft);
    this.groups.bottomRight.offsetY(clampedScrollTop);

    // 触发重新渲染
    this.layer.batchDraw();
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

    // 更新各区域位置和内容
    this.updateGroups();
  }
}

export default VirtualTable;
