const express = require('express');
const db = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/dashboard/stats
router.get('/stats', (req, res) => {
  let projectFilter = '';
  let params = [];
  let userParams = [];

  if (req.user.role !== 'admin') {
    projectFilter = `AND t.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?)`;
    params = [req.user.id];
    userParams = [req.user.id];
  }

  const taskStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'review' THEN 1 ELSE 0 END) as review,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
      SUM(CASE WHEN due_date < date('now') AND status != 'done' THEN 1 ELSE 0 END) as overdue,
      SUM(CASE WHEN priority = 'urgent' AND status != 'done' THEN 1 ELSE 0 END) as urgent
    FROM tasks t WHERE 1=1 ${projectFilter}
  `).get(...params);

  let projectStats;
  if (req.user.role === 'admin') {
    projectStats = db.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active FROM projects`).get();
  } else {
    projectStats = db.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN p.status='active' THEN 1 ELSE 0 END) as active FROM projects p JOIN project_members pm ON p.id = pm.project_id WHERE pm.user_id = ?`).get(req.user.id);
  }

  const myTasks = db.prepare(`
    SELECT COUNT(*) as total,
      SUM(CASE WHEN due_date < date('now') AND status != 'done' THEN 1 ELSE 0 END) as overdue
    FROM tasks WHERE assignee_id = ?
  `).get(req.user.id);

  // Recent activity
  const recentTasks = db.prepare(`
    SELECT t.id, t.title, t.status, t.priority, t.updated_at, t.due_date,
      p.name as project_name, p.color as project_color,
      u.name as assignee_name, u.avatar as assignee_avatar
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON t.assignee_id = u.id
    WHERE 1=1 ${projectFilter}
    ORDER BY t.updated_at DESC LIMIT 10
  `).all(...params);

  const overdueTasksList = db.prepare(`
    SELECT t.id, t.title, t.status, t.priority, t.due_date,
      p.name as project_name, p.color as project_color,
      u.name as assignee_name, u.avatar as assignee_avatar
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON t.assignee_id = u.id
    WHERE t.due_date < date('now') AND t.status != 'done' ${projectFilter}
    ORDER BY t.due_date ASC LIMIT 5
  `).all(...params);

  res.json({
    taskStats,
    projectStats,
    myTasks,
    recentTasks,
    overdueTasksList,
  });
});

// GET /api/dashboard/users (admin only)
router.get('/users', requireAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.avatar, u.created_at,
      COUNT(DISTINCT pm.project_id) as project_count,
      COUNT(DISTINCT t.id) as task_count
    FROM users u
    LEFT JOIN project_members pm ON u.id = pm.user_id
    LEFT JOIN tasks t ON u.id = t.assignee_id AND t.status != 'done'
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all();
  res.json({ users });
});

// PUT /api/dashboard/users/:id/role (admin only)
router.put('/users/:id/role', requireAdmin, (req, res) => {
  const { role } = req.body;
  if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.json({ message: 'Role updated' });
});

// DELETE /api/dashboard/users/:id (admin only)
router.delete('/users/:id', requireAdmin, (req, res) => {
  if (req.params.id == req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ message: 'User deleted' });
});

module.exports = router;