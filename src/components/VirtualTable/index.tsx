import { useEffect, useRef } from "react";
import VirtualTable from "./core/Table";

const Table = () => {
  const tableEleRef = useRef<HTMLDivElement>(null);

  const genColumnsOptimized = () => {
    return Array.from({ length: 20 }, (_, index) => ({
      title: `列 ${index + 1}`,
      width: 180,
      lock: index === 0,
    }));
  };

  const genRealisticDataSource = () => {
    const firstNames = [
      "张",
      "李",
      "王",
      "刘",
      "陈",
      "杨",
      "赵",
      "黄",
      "周",
      "吴",
    ];
    const lastNames = [
      "明",
      "华",
      "强",
      "伟",
      "芳",
      "娜",
      "磊",
      "军",
      "杰",
      "静",
    ];
    const departments = [
      "技术部",
      "销售部",
      "市场部",
      "人事部",
      "财务部",
      "研发部",
    ];

    return Array.from({ length: 2000 }, (_, rowIndex) => [
      `EMP${String(rowIndex + 1).padStart(5, "0")}`, // 员工编号
      `${firstNames[rowIndex % firstNames.length]}${
        lastNames[rowIndex % lastNames.length]
      }`, // 姓名
      `${20 + (rowIndex % 40)}岁`, // 年龄
      departments[rowIndex % departments.length], // 部门
      `${(3000 + (rowIndex % 7000)).toLocaleString()}元`, // 薪资
      `${(rowIndex % 5) + 1}年`, // 工龄
      `项目${(rowIndex % 10) + 1}`, // 当前项目
      `${80 + (rowIndex % 20)}%`, // 绩效
      rowIndex % 3 === 0 ? "在职" : rowIndex % 3 === 1 ? "休假" : "离职", // 状态
      `level-${(rowIndex % 7) + 1}`, // 职级
      `team-${(rowIndex % 8) + 1}`, // 团队
      `${90 + (rowIndex % 10)}分`, // 评分
      `skill-${(rowIndex % 6) + 1}`, // 技能
      `city-${(rowIndex % 10) + 1}`, // 城市
      `202${rowIndex % 4}-${String((rowIndex % 12) + 1).padStart(
        2,
        "0"
      )}-${String((rowIndex % 28) + 1).padStart(2, "0")}`, // 入职日期
      `phone-${13000000000 + rowIndex}`, // 电话
      `email${rowIndex}@company.com`, // 邮箱
      `addr-${(rowIndex % 20) + 1}`, // 地址
      `note-${rowIndex}`, // 备注
      `ext-${rowIndex}`, // 扩展信息
    ]);
  };

  useEffect(() => {
    if (tableEleRef.current) {
      new VirtualTable({
        container: tableEleRef.current,
        columns: genColumnsOptimized(),
        dataSource: genRealisticDataSource(),
      });
    }
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
