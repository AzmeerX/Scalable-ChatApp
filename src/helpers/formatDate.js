export default function formatDay(date) {
    const today = new Date();
    const msgDate = new Date(date);

    const isToday =
        msgDate.getDate() === today.getDate() &&
        msgDate.getMonth() === today.getMonth() &&
        msgDate.getFullYear() === today.getFullYear();

    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);

    const isYesterday =
        msgDate.getDate() === yesterday.getDate() &&
        msgDate.getMonth() === yesterday.getMonth() &&
        msgDate.getFullYear() === yesterday.getFullYear();

    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";

    return msgDate.toLocaleDateString(); 
}