export const getLaneColor = (trafficType: number, laneName: string) => {
  if (trafficType === 1) {
    // 지하철
    const subwayCode = laneName.match(/\d+/)?.[0];
    if (subwayCode) {
      const code = parseInt(subwayCode);
      // 주요 지하철 노선 색상
      if (code === 1) return "#0052A4"; // 1호선
      if (code === 2) return "#00A84D"; // 2호선
      if (code === 3) return "#EF7C1C"; // 3호선
      if (code === 4) return "#00A5DE"; // 4호선
      if (code === 5) return "#996CAC"; // 5호선
      if (code === 6) return "#CD7C2F"; // 6호선
      if (code === 7) return "#747F00"; // 7호선
      if (code === 8) return "#E6186C"; // 8호선
      if (code === 9) return "#BDB092"; // 9호선
    }
    // 신분당선, 경의중앙선 등
    if (laneName.includes("신분당선")) return "#D31145";
    if (laneName.includes("경의중앙선")) return "#77C4A3";
    if (laneName.includes("수인분당선")) return "#F5A200";
    return "#9333ea"; // 기본 보라색
  }
  return "#3498DB"; // 버스는 파란색
};
