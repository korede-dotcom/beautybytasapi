const router = require('express').Router();
const { authenticated } = require('../middleware/auth');
const { Newsletter, Subscriber } = require('../models/associations');
const axios = require('axios');
const { Op } = require('sequelize');

// Import Substack API configuration
const SUBSTACK_API_KEY = process.env.SUBSTACK_API_KEY;
const SUBSTACK_PUBLICATION_ID = process.env.SUBSTACK_PUBLICATION_ID;
const SUBSTACK_API_URL = 'https://api.substack.com/api/v1';

// Middleware to check Substack configuration
const checkSubstackConfig = (req, res, next) => {
    if (!SUBSTACK_API_KEY || !SUBSTACK_PUBLICATION_ID) {
        return res.status(500).json({
            status: false,
            message: "Substack configuration is missing"
        });
    }
    next();
};

// Get Substack publication stats
router.get('/stats', authenticated, checkSubstackConfig, async (req, res) => {
    try {
        const response = await axios.get(`${SUBSTACK_API_URL}/publications/${SUBSTACK_PUBLICATION_ID}/stats`, {
            headers: {
                'Authorization': `Bearer ${SUBSTACK_API_KEY}`
            }
        });

        res.json({
            status: true,
            message: "Substack stats retrieved successfully",
            data: response.data
        });
    } catch (error) {
        console.error("Substack stats fetch error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

// Get Substack posts
router.get('/posts', authenticated, checkSubstackConfig, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const response = await axios.get(`${SUBSTACK_API_URL}/publications/${SUBSTACK_PUBLICATION_ID}/posts`, {
            headers: {
                'Authorization': `Bearer ${SUBSTACK_API_KEY}`
            },
            params: {
                limit,
                offset
            }
        });

        res.json({
            status: true,
            message: "Substack posts retrieved successfully",
            data: {
                posts: response.data.posts,
                pagination: {
                    totalItems: response.data.total,
                    totalPages: Math.ceil(response.data.total / limit),
                    currentPage: page,
                    itemsPerPage: limit
                }
            }
        });
    } catch (error) {
        console.error("Substack posts fetch error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

// Create a new Substack post
router.post('/posts', authenticated, checkSubstackConfig, async (req, res) => {
    try {
        const { title, subtitle, body, isDraft = true } = req.body;

        if (!title || !body) {
            return res.status(400).json({
                status: false,
                message: "Title and body are required"
            });
        }

        const response = await axios.post(
            `${SUBSTACK_API_URL}/publications/${SUBSTACK_PUBLICATION_ID}/posts`,
            {
                title,
                subtitle,
                body,
                isDraft
            },
            {
                headers: {
                    'Authorization': `Bearer ${SUBSTACK_API_KEY}`
                }
            }
        );

        // Create a corresponding newsletter record
        const newsletter = await Newsletter.create({
            subject: title,
            content: body,
            htmlContent: body,
            template: 'substack',
            status: isDraft ? 'draft' : 'sent',
            sentAt: isDraft ? null : new Date(),
            substackPostId: response.data.id
        });

        res.json({
            status: true,
            message: isDraft ? "Substack post draft created successfully" : "Substack post published successfully",
            data: {
                post: response.data,
                newsletterId: newsletter.id
            }
        });
    } catch (error) {
        console.error("Substack post creation error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

// Update a Substack post
router.put('/posts/:postId', authenticated, checkSubstackConfig, async (req, res) => {
    try {
        const { postId } = req.params;
        const { title, subtitle, body, isDraft } = req.body;

        const response = await axios.put(
            `${SUBSTACK_API_URL}/publications/${SUBSTACK_PUBLICATION_ID}/posts/${postId}`,
            {
                title,
                subtitle,
                body,
                isDraft
            },
            {
                headers: {
                    'Authorization': `Bearer ${SUBSTACK_API_KEY}`
                }
            }
        );

        // Update the corresponding newsletter record
        const newsletter = await Newsletter.findOne({
            where: { substackPostId: postId }
        });

        if (newsletter) {
            await newsletter.update({
                subject: title,
                content: body,
                htmlContent: body,
                status: isDraft ? 'draft' : 'sent',
                sentAt: isDraft ? null : new Date()
            });
        }

        res.json({
            status: true,
            message: "Substack post updated successfully",
            data: {
                post: response.data,
                newsletterId: newsletter?.id
            }
        });
    } catch (error) {
        console.error("Substack post update error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

// Delete a Substack post
router.delete('/posts/:postId', authenticated, checkSubstackConfig, async (req, res) => {
    try {
        const { postId } = req.params;

        await axios.delete(
            `${SUBSTACK_API_URL}/publications/${SUBSTACK_PUBLICATION_ID}/posts/${postId}`,
            {
                headers: {
                    'Authorization': `Bearer ${SUBSTACK_API_KEY}`
                }
            }
        );

        // Update the corresponding newsletter record
        const newsletter = await Newsletter.findOne({
            where: { substackPostId: postId }
        });

        if (newsletter) {
            await newsletter.update({
                status: 'deleted'
            });
        }

        res.json({
            status: true,
            message: "Substack post deleted successfully",
            data: {
                newsletterId: newsletter?.id
            }
        });
    } catch (error) {
        console.error("Substack post deletion error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

// Sync Substack subscribers
router.post('/sync-subscribers', authenticated, checkSubstackConfig, async (req, res) => {
    try {
        const response = await axios.get(
            `${SUBSTACK_API_URL}/publications/${SUBSTACK_PUBLICATION_ID}/subscribers`,
            {
                headers: {
                    'Authorization': `Bearer ${SUBSTACK_API_KEY}`
                }
            }
        );

        const subscribers = response.data.subscribers;
        const syncedCount = { added: 0, updated: 0 };

        for (const substackSub of subscribers) {
            const [subscriber, created] = await Subscriber.findOrCreate({
                where: { email: substackSub.email },
                defaults: {
                    name: substackSub.name,
                    subscribed: true,
                    subscribedAt: new Date(substackSub.subscribed_at),
                    source: 'substack',
                    tags: ['substack']
                }
            });

            if (!created) {
                await subscriber.update({
                    name: substackSub.name,
                    subscribed: true,
                    subscribedAt: new Date(substackSub.subscribed_at)
                });
                syncedCount.updated++;
            } else {
                syncedCount.added++;
            }
        }

        res.json({
            status: true,
            message: "Substack subscribers synced successfully",
            data: {
                totalSubscribers: subscribers.length,
                syncedCount
            }
        });
    } catch (error) {
        console.error("Substack subscriber sync error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

module.exports = router; 