import { useEffect, useState } from "react";
import { getAllBoardRequests, updateBoardRequestStatus } from "../../api/communityApi";
// import Header from "../../components/Common/Header";
import styles from "../../styles/MyPage/BoardRequestList.module.css";

const BoardRequestList = () => {
    const [requestList, setRequestList] = useState([]);

    const fetchBoardList = async () => {
        try {
            const response = await getAllBoardRequests();
            setRequestList(response.data.requests);
        } catch (error) {
            console.error("게시판 개설 신청 목록 조회에 실패했습니다.", error);
        }
    };

    useEffect(() => {
        fetchBoardList();
    }, []);

    const handleUpdateStatus = async (requestId, newStatus) => {
        try {
            await updateBoardRequestStatus(requestId, newStatus);
            fetchBoardList();
        } catch (error) {
            console.error("상태 변경 실패:", error);
        }
    };

    return (
        <div className={styles.container}>
            {/* <Header /> */}
            <h2 className={styles.title}>게시판 개설 신청 목록</h2>

            <div className={styles.tableContainer}>
                <div className={styles.tableHeader}>
                    <div>신청자</div>
                    <div>게시판 이름</div>
                    <div>타입</div>
                    <div>대상</div>
                    <div>신청 사유</div>
                    <div>신청 일자</div>
                    <div>승인/거절</div>
                </div>

                {requestList.length === 0 ? (
                    <div className={styles.empty}>신청된 게시판이 없습니다.</div>
                ) : (
                    requestList.map((req) => (
                        <div key={req.request_id} className={styles.tableRow}>
                            <div>{req.User?.name || "알 수 없음"}</div>
                            <div>{req.requested_board_name}</div>
                            <div>{req.requested_board_type}</div>
                            <div>{req.board_audience}</div>
                            <div className={styles.reason}>{req.request_reason}</div>
                            <div>{new Date(req.request_date).toLocaleDateString()}</div>
                            <div className={styles.actionCell}>
                                {req.request_status === "approved" ? (
                                    <span className={styles.approved}>승인됨</span>
                                ) : req.request_status === "rejected" ? (
                                    <span className={styles.rejected}>거절됨</span>
                                ) : (
                                    <div className={styles.buttonGroup}>
                                        <button
                                            className={styles.approveBtn}
                                            onClick={() =>
                                                handleUpdateStatus(req.request_id, "approved")
                                            }>
                                            승인
                                        </button>
                                        <button
                                            className={styles.rejectBtn}
                                            onClick={() =>
                                                handleUpdateStatus(req.request_id, "rejected")
                                            }>
                                            거절
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default BoardRequestList;
