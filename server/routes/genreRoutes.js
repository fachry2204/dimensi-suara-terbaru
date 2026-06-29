import express from 'express';
import db from '../config/db.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const [genres] = await db.query(
            `SELECT id, name, slug 
             FROM genres 
             WHERE is_active = 1 
             ORDER BY sort_order, name`
        );
        res.json({ success: true, data: genres });
    } catch (error) {
        console.error('Error fetching genres:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

router.get('/:genreId/subgenres', async (req, res) => {
    try {
        const { genreId } = req.params;
        const [subgenres] = await db.query(
            `SELECT id, genre_id, name, slug 
             FROM subgenres 
             WHERE genre_id = ? AND is_active = 1 
             ORDER BY sort_order, name`,
            [genreId]
        );
        res.json({ success: true, data: subgenres });
    } catch (error) {
        console.error('Error fetching subgenres:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

export default router;
