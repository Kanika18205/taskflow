const express = require('express');
const { body, query, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, requireProjectAccess } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/tasks - Get tasks (with filters)
router.get('/', (req, res) => {
  const { project_id, status, priority, assignee_id, overdue } = req.query;

  let sql = `
    SELECT t.*,
      u1.name as assignee_name, u1.avatar as assignee_avatar,
      u2.name as creator_name,
      p.name as project_name, p.color as project_color
    FROM tasks t
    LEFT JOIN users u1 ON t.assignee_id = u1.id
    LEFT JOIN users u2 ON t.creator_id = u2.id
    LEFT JOIN projects p ON t.project_id = p.id
  `;

  const conditions = [];
  const params = [];

  // Filter by accessible projects
  if (req.user.role !== 'admin') {
    conditions.push(`t.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?)`);
    params.push(req.user.id);
  }

  if (project_id) { conditions.push('t.project_id = ?'); params.push(project_id); }
  if (status) { conditions.push('t.status = ?'); params.push(status); }
  if (priority) { conditions.push('t.priority = ?'); params.push(priority); }
  if (assignee_id) { conditions.push('t.assignee_id = ?'); params.push(assignee_id); }
  if (overdue === 'true') {
    conditions.push(`t.due_date < date('now') AND t.status != 'done'`);
  }

  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY t.created_at DESC';

  const tasks = db.prepare(sql).all(...params);
  res.json({ tasks });
});

// GET /api/tasks/my - Get tasks assigned to current user
router.get('/my', (req, res) => {
  const tasks = db.prepare(`
    SELECT t.*,
      u1.name as assignee_name, u1.avatar as assignee_avatar,
      u2.name as creator_name,
      p.name as project_name, p.color as project_color
    FROM tasks t
    LEFT JOIN users u1 ON t.assignee_id = u1.id
    LEFT JOIN users u2 ON t.creator_id = u2.id
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.assignee_id = ?
    ORDER BY 
      CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
      t.due_date ASC NULLS LAST
  `).all(req.user.id);
  res.json({ tasks });
});

// GET /api/tasks/:id
router.get('/:id', (req, res) => {
  const task = db.prepare(`
    SELECT t.*,
      u1.name as assignee_name, u1.avatar as assignee_avatar,
      u2.name as creator_name,
      p.name as project_name, p.color as project_color
    FROM tasks t
    LEFT JOIN users u1 ON t.assignee_id = u1.id
    LEFT JOIN users u2 ON t.creator_id = u2.id
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.id = ?
  `).get(req.params.id);

  if (!task) return res.status(404).json({ error: 'Task not found' });

  const comments = db.prepare(`
    SELECT c.*, u.name as user_name, u.avatar as user_avatar
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.task_id = ? ORDER BY c.created_at ASC
  `).all(req.params.id);

  res.json({ task, comments });
});

// POST /api/tasks
router.post('/', [
  body('title').trim().notEmpty().withMessage('Title required').isLength({ max: 300 }),
  body('description').optional().isLength({ max: 2000 }),
  body('project_id').isInt().withMessage('Valid project ID required'),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('assignee_id').optional().isInt(),
  body('due_date').optional().isDate(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description = '', project_id, status = 'todo', priority = 'medium', assignee_id, due_date } = req.body;

  // Check project access
  if (req.user.role !== 'admin') {
    const membership = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(project_id, req.user.id);
    if (!membership) return res.status(403).json({ error: 'Not a member of this project' });
  }

  // Validate assignee is project member
  if (assignee_id) {
    const member = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(project_id, assignee_id);
    if (!member) return res.status(400).json({ error: 'Assignee is not a project member' });
  }

  const result = db.prepare(`
    INSERT INTO tasks (title, description, project_id, status, priority, assignee_id, creator_id, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, description, project_id, status, priority, assignee_id || null, req.user.id, due_date || null);

  const task = db.prepare(`
    SELECT t.*, u1.name as assignee_name, u1.avatar as assignee_avatar,
      u2.name as creator_name, p.name as project_name, p.color as project_color
    FROM tasks t
    LEFT JOIN users u1 ON t.assignee_id = u1.id
    LEFT JOIN users u2 ON t.creator_id = u2.id
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ task });
});

// PUT /api/tasks/:id
router.put('/:id', [
  body('title').optional().trim().notEmpty().isLength({ max: 300 }),
  body('description').optional().isLength({ max: 2000 }),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('assignee_id').optional({ nullable: true }).isInt(),
  body('due_date').optional({ nullable: true }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  // Check access
  if (req.user.role !== 'admin') {
    const membership = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(task.project_id, req.user.id);
    if (!membership) return res.status(403).json({ error: 'Not a member of this project' });
  }

  const { title, description, status, priority, assignee_id, due_date } = req.body;

  db.prepare(`
    UPDATE tasks SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      status = COALESCE(?, status),
      priority = COALESCE(?, priority),
      assignee_id = CASE WHEN ? IS NOT NULL THEN ? ELSE assignee_id END,
      due_date = CASE WHEN ? IS NOT NULL THEN ? ELSE due_date END
    WHERE id = ?
  `).run(title, description, status, priority, assignee_id, assignee_id, due_date, due_date, req.params.id);

  const updated = db.prepare(`
    SELECT t.*, u1.name as assignee_name, u1.avatar as assignee_avatar,
      u2.name as creator_name, p.name as project_name, p.color as project_color
    FROM tasks t
    LEFT JOIN users u1 ON t.assignee_id = u1.id
    LEFT JOIN users u2 ON t.creator_id = u2.id
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.id = ?
  `).get(req.params.id);

  res.json({ task: updated });
});

// DELETE /api/tasks/:id
router.delete('/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (req.user.role !== 'admin' && task.creator_id !== req.user.id) {
    const membership = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(task.project_id, req.user.id);
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only task creator or project admin can delete' });
    }
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ message: 'Task deleted' });
});

// POST /api/tasks/:id/comments
router.post('/:id/comments', [
  body('content').trim().notEmpty().isLength({ max: 2000 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const result = db.prepare('INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)').run(req.params.id, req.user.id, req.body.content);
  const comment = db.prepare(`
    SELECT c.*, u.name as user_name, u.avatar as user_avatar
    FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ comment });
});

module.exports = router;