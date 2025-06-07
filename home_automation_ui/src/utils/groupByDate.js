export function groupByDate(list) {
    return list.reduce((acc, item) => {
      const day = item.dt_txt.slice(0,10); // “YYYY‑MM‑DD”
      if (!acc[day]) acc[day] = [];
      acc[day].push(item);
      return acc;
    }, {});
  }
  