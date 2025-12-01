import styles from "../../styles/Calendar/CalendarView.module.css";
import { useContext } from "react";
import { CurrentDateContext } from "../../contexts/CurrentDateContext";
import { SearchTypeContext } from "../../contexts/SearchTypeContext";
import { ViewContext } from "../../contexts/ViewContext";
import EventBadge from "./EventBadge";

const WeeklyView = () => {
    const { currentDate } = useContext(CurrentDateContext);
    const { searchType } = useContext(SearchTypeContext);
    const { schedules } = useContext(ViewContext);

    const currentMonth = currentDate.month();
    const startOfWeek = currentDate.clone().startOf("week");
    const days = Array.from({ length: 7 }, (_, i) => {
        const date = startOfWeek.clone().add(i, "day");

        // 현재 주가 해당 월의 첫 주인지 마지막 주인지 확인
        const isFirstWeek = date.clone().startOf("week").month() < currentMonth;
        const isLastWeek = date.clone().endOf("week").month() > currentMonth;

        // 날짜 조건으로 판단
        const dateNum = date.date();
        const isOtherMonth =
            (isFirstWeek && dateNum > 7) || (isLastWeek && dateNum < 10);

        return { date, isOtherMonth };
    });

    return (
        <div className={styles.weeklyDays}>
            {days.map(({ date, isOtherMonth }, index) => {
                const targetDate =
                    searchType.type === "region"
                        ? date.format("YYYY-MM-DD")
                        : date.format("YYYYMMDD");

                const events = Array.isArray(schedules)
                    ? schedules.filter((schedule) => {
                        if (searchType.type === "region") {
                            return (
                                schedule.average_date === targetDate &&
                                schedule.school_type === searchType.schoolType
                            );
                        } else {
                            return schedule.AA_YMD === targetDate;
                        }
                    })
                    : [];


                return (
                    <div
                        key={index}
                        className={`${styles.weeklyDay} ${
                            isOtherMonth ? styles.otherMonth : ""
                        }`}>
                        <div className={styles.dateText}>{date.date()}</div>
                        <div className={styles.weeklyEvent}>
                            {!isOtherMonth &&
                                events.length > 0 &&
                                events.map((event) => (
                                    <EventBadge
                                        key={event.averageSchedule_id || event.AA_YMD}
                                        event_name={event.event_name || event.EVENT_NM}
                                    />
                                ))
                            }
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default WeeklyView;
