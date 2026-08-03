const getWIBDate = () => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wibOffset = 7 * 60 * 60000; // UTC+7
  return new Date(utc + wibOffset);
};

const getWIBISOString = () => {
  const date = getWIBDate();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

console.log("WIB ISO:", getWIBISOString());
console.log("WIB Day:", getWIBDate().getDay());
