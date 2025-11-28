import Konva from "konva";
import { useEffect, useRef } from "react";

const rows = 2000;
const cols = 10;
const cellHeight = 32;
const cellWidth = 180;

const Table = () => {
  const tableEleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tableEleRef.current) {
      return;
    }
    const stage = new Konva.Stage({
      container: tableEleRef.current,
      width: cols * cellWidth,
      height: rows * cellHeight,
    });

    const layer = new Konva.Layer();
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        const cellRect = new Konva.Rect({
          x: x * cellWidth,
          y: y * cellHeight,
          width: cellWidth,
          height: cellHeight,
          stroke: "#ccc",
          strokeWidth: 1,
        });
        layer.add(cellRect);
      }
    }

    stage.add(layer);
  }, []);

  return (
    <div
      ref={tableEleRef}
      style={{
        height: "100vh",
        width: "100vw",
      }}
    />
  );
};

export default Table;
