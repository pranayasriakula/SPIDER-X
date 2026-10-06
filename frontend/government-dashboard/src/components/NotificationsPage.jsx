import { useEffect, useMemo, useState } from 'react';
import { getNotifications, markNotificationRead } from '../api/client.js';

const displayDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : 'Not available';
};

const relatedReference = (notification) => (
  notification.related_entity
  || notification.reference
  || notification.entity_id
  || notification.report_id
  || notification.action_id
  || null
);

function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [notificationState, setNotificationState] = useState('loading');
  const [notificationError, setNotificationError] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [markingId, setMarkingId] = useState(null);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const loadNotifications = async () => {
      setNotificationState('loading'); setNotificationError('');
      try {
        const data = await getNotifications();
        if (!Array.isArray(data)) throw new Error('The backend returned an unexpected notifications format.');
        setNotifications(data); setNotificationState('ready');
      } catch (error) {
        setNotifications([]); setNotificationError(error.message || 'Unable to load notifications.'); setNotificationState('error');
      }
    };
    loadNotifications();
  }, []);

  const filteredNotifications = useMemo(() => notifications.filter((notification) => (
    filter === 'all' || (filter === 'unread' ? !notification.is_read : notification.is_read)
  )), [filter, notifications]);

  const selectNotification = (notification) => {
    setSelectedNotification(notification);
    setFeedback('');
  };

  const markRead = async (notification) => {
    if (notification.is_read || markingId) return;
    setMarkingId(notification.notification_id); setFeedback('');
    try {
      const updated = await markNotificationRead(notification.notification_id);
      setNotifications((current) => current.map((item) => item.notification_id === updated.notification_id ? updated : item));
      setSelectedNotification((current) => current?.notification_id === updated.notification_id ? updated : current);
      setFeedback('Notification marked as read.');
    } catch (error) {
      setFeedback(error.message || 'Unable to mark the notification as read.');
    } finally { setMarkingId(null); }
  };

  return <section className="notifications-page">
    <div className="page-heading"><div><p className="eyebrow">Authority workspace</p><h2>Notifications</h2><p>Review updates sent to your authenticated Government Authority account.</p></div></div>
    <section className="notifications-workspace">
      <section className="notifications-list-panel">
        <div className="notification-filters" aria-label="Notification filters"><button className={filter === 'all' ? 'active' : ''} type="button" onClick={() => setFilter('all')}>All</button><button className={filter === 'unread' ? 'active' : ''} type="button" onClick={() => setFilter('unread')}>Unread</button><button className={filter === 'read' ? 'active' : ''} type="button" onClick={() => setFilter('read')}>Read</button></div>
        {notificationState === 'loading' && <p className="section-message">Loading notifications…</p>}
        {notificationState === 'error' && <p className="section-message error">{notificationError}</p>}
        {notificationState === 'ready' && notifications.length === 0 && <p className="section-message">You have no notifications.</p>}
        {notificationState === 'ready' && notifications.length > 0 && filteredNotifications.length === 0 && <p className="section-message">No notifications match this filter.</p>}
        {notificationState === 'ready' && filteredNotifications.length > 0 && <div className="notification-list">{filteredNotifications.map((notification) => <button className={`notification-card ${notification.is_read ? 'read' : 'unread'} ${selectedNotification?.notification_id === notification.notification_id ? 'selected' : ''}`} key={notification.notification_id} type="button" onClick={() => selectNotification(notification)}><div className="notification-card-top"><span className="notification-state">{notification.is_read ? 'Read' : 'Unread'}</span><span>{displayDate(notification.created_at)}</span></div><strong>{notification.title}</strong><p>{notification.type || 'Notification'}</p><span>{notification.message}</span></button>)}</div>}
      </section>
      <aside className="notification-detail-panel" aria-live="polite">{!selectedNotification && <p className="section-message">Select a notification to review its full details.</p>}{selectedNotification && <><div className="detail-heading"><p className="eyebrow">Notification details</p><h2>{selectedNotification.title}</h2><span className={`notification-state ${selectedNotification.is_read ? 'read' : 'unread'}`}>{selectedNotification.is_read ? 'Read' : 'Unread'}</span></div><dl className="detail-list"><div><dt>Notification ID</dt><dd>{selectedNotification.notification_id}</dd></div><div><dt>Type</dt><dd>{selectedNotification.type || 'Not available'}</dd></div><div><dt>Message</dt><dd>{selectedNotification.message}</dd></div><div><dt>Created</dt><dd>{displayDate(selectedNotification.created_at)}</dd></div>{relatedReference(selectedNotification) && <div><dt>Related reference</dt><dd>{relatedReference(selectedNotification)}</dd></div>}</dl>{!selectedNotification.is_read && <button className="primary-action" type="button" disabled={markingId === selectedNotification.notification_id} onClick={() => markRead(selectedNotification)}>{markingId === selectedNotification.notification_id ? 'Marking as read…' : 'Mark as read'}</button>}{feedback && <p className={`inline-message ${feedback.startsWith('Unable') ? 'error' : ''}`}>{feedback}</p>}</>}</aside>
    </section>
  </section>;
}

export default NotificationsPage;
