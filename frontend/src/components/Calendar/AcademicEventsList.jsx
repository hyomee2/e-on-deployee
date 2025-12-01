import styles from "../../styles/Calendar/AcademicEventsList.module.css";
import { CurrentDateContext } from "../../contexts/CurrentDateContext";
import { SearchTypeContext } from "../../contexts/SearchTypeContext";
import { ViewContext } from "../../contexts/ViewContext";
import { useContext, useMemo } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isBetween); // isBetween 플러그인 확장

/* [일정 그룹화한 학사일정 리스트 렌더링 코드] */
const AcademicEventsList = () => {
    const { currentDate } = useContext(CurrentDateContext);
    const { searchType } = useContext(SearchTypeContext);
    const { schedules } = useContext(ViewContext);

    // schedules 안전 처리 (null/undefined/object 대비)
    const safeSchedules = Array.isArray(schedules) ? schedules : [];

    const startOfMonth = currentDate.clone().startOf("month");
    const endOfMonth = currentDate.clone().endOf("month");

    // 해당 월 기준 이벤트 필터링
    const filteredEvents = useMemo(() => {
        return safeSchedules
            .filter((event) => {
                const dateStr =
                    searchType.type === "region"
                        ? event.average_date
                        : event.AA_YMD;

                const eventDate =
                    searchType.type === "region"
                        ? dayjs(dateStr, "YYYY-MM-DD")
                        : dayjs(dateStr, "YYYYMMDD");

                const isInMonth = eventDate.isBetween(
                    startOfMonth,
                    endOfMonth,
                    "day",
                    "[]"
                );

                const isCorrectSchoolType =
                    searchType.type === "region"
                        ? event.school_type === searchType.schoolType
                        : true;

                return isInMonth && isCorrectSchoolType;
            })
            .sort((a, b) => {
                const aDate =
                    searchType.type === "region"
                        ? dayjs(a.average_date)
                        : dayjs(a.AA_YMD, "YYYYMMDD");
                const bDate =
                    searchType.type === "region"
                        ? dayjs(b.average_date)
                        : dayjs(b.AA_YMD, "YYYYMMDD");

                return aDate.unix() - bDate.unix();
            });
    }, [safeSchedules, searchType, currentDate]);

    // 필터링된 이벤트가 같은 날짜라면 묶음
    const groupedEvents = useMemo(() => {
        const grouped = {};

        filteredEvents.forEach((event) => {
            const dateStr =
                searchType.type === "region"
                    ? event.average_date
                    : event.AA_YMD;

            const eventDate =
                searchType.type === "region"
                    ? dayjs(dateStr, "YYYY-MM-DD")
                    : dayjs(dateStr, "YYYYMMDD");

            const day = eventDate.date();

            if (!grouped[day]) {
                grouped[day] = [];
            }

            grouped[day].push({
                name: event.event_name || event.EVENT_NM,
                fullDate: eventDate,
            });
        });

        return Object.entries(grouped)
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([day, events]) => ({ day, events }));
    }, [filteredEvents, searchType]);

    return (
        <div className={styles.academicEventsList}>
            <div className={styles.title}>
                {currentDate.year()}년 {currentDate.month() + 1}월 주요 학사일정
            </div>
            <div className={styles.eventRows}>
                {groupedEvents.length === 0 ? (
                    <div className={styles.eventRow}>이 달의 일정이 없습니다.</div>
                ) : (
                    groupedEvents.map(({ day, events }, idx) => (
                        <div className={styles.eventRow} key={idx}>
                            <div className={styles.day}>{day}일</div>
                            <div className={styles.verticalLine}></div>
                            <div className={styles.content}>
                                {events.map((e, i) => (
                                    <span key={i}>
                                        {e.name}
                                        {i < events.length - 1 && ", "}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AcademicEventsList;

/* [일정 그룹화 X, 기본 학사일정 리스트 렌더링 코드] */
// const AcademicEventsList = () => {
//     const { currentDate } = useContext(CurrentDateContext);
//     const { searchType } = useContext(SearchTypeContext);
//     const { schedules } = useContext(ViewContext);

//     const startOfMonth = currentDate.startOf("month");
//     const endOfMonth = currentDate.endOf("month");

//     const filteredEvents = useMemo(() => {
//         if (!schedules) return [];

//         return schedules
//             .filter((event) => {
//                 const dateStr =
//                     searchType.type === "region"
//                         ? event.average_date
//                         : event.AA_YMD;

//                 const eventDate =
//                     searchType.type === "region"
//                         ? dayjs(dateStr, "YYYY-MM-DD")
//                         : dayjs(dateStr, "YYYYMMDD");

//                 const isInMonth = eventDate.isBetween(
//                     startOfMonth,
//                     endOfMonth,
//                     "day",
//                     "[]"
//                 );

//                 const isCorrectSchoolType =
//                     searchType.type === "region"
//                         ? event.school_type === searchType.schoolType
//                         : true;

//                 return isInMonth && isCorrectSchoolType;
//             })
//             .sort((a, b) => {
//                 const aDate =
//                     searchType.type === "region"
//                         ? dayjs(a.average_date)
//                         : dayjs(a.AA_YMD, "YYYYMMDD");
//                 const bDate =
//                     searchType.type === "region"
//                         ? dayjs(b.average_date)
//                         : dayjs(b.AA_YMD, "YYYYMMDD");

//                 return aDate.unix() - bDate.unix();
//             });
//     }, [schedules, searchType, currentDate]);

//     return (
//         <div className={styles.academicEventsList}>
//             <div className={styles.title}>
//                 {currentDate.year()}년 {currentDate.month() + 1}월 주요 학사
//                 일정
//             </div>
//             <div className={styles.eventRows}>
//                 {filteredEvents.length === 0 ? (
//                     <div className={styles.eventRow}>
//                         이 달의 일정이 없습니다.
//                     </div>
//                 ) : (
//                     filteredEvents.map((event, idx) => {
//                         const dateStr =
//                             searchType.type === "region"
//                                 ? event.average_date
//                                 : event.AA_YMD;

//                         const eventDate =
//                             searchType.type === "region"
//                                 ? dayjs(dateStr, "YYYY-MM-DD")
//                                 : dayjs(dateStr, "YYYYMMDD");

//                         return (
//                             <div className={styles.eventRow} key={idx}>
//                                 <div className={styles.day}>
//                                     {eventDate.date()}일
//                                 </div>
//                                 <div className={styles.verticalLine}></div>
//                                 <div className={styles.content}>
//                                     {event.event_name || event.EVENT_NM}
//                                 </div>
//                             </div>
//                         );
//                     })
//                 )}
//             </div>
//         </div>
//     );
// };

// export default AcademicEventsList;
