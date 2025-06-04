const router = require('express').Router();
const { authenticated } = require('../middleware/auth');
const { Newsletter, Subscriber, NewsletterTemplate } = require('../models/associations');
const { Op } = require('sequelize');
const { QueryTypes } = require('sequelize');

// Send Newsletter
router.post('/send', authenticated, async (req, res) => {
    try {
        const {
            subject,
            content,
            htmlContent,
            template,
            sendToAll,
            recipients,
            scheduledDate
        } = req.body;

        // Validate required fields
        if (!subject || !content || !htmlContent) {
            return res.status(400).json({
                status: false,
                message: "Subject, content, and HTML content are required"
            });
        }

        // Create newsletter record
        const newsletter = await Newsletter.create({
            subject,
            content,
            htmlContent,
            template,
            sendToAll,
            recipients: sendToAll ? [] : recipients,
            scheduledDate,
            status: scheduledDate ? 'scheduled' : 'draft'
        });

        // If not scheduled, send immediately
        if (!scheduledDate) {
            // TODO: Implement actual email sending logic here
            // For now, we'll just update the status
            await newsletter.update({
                status: 'sent',
                sentAt: new Date(),
                sentCount: recipients.length
            });
        }

        res.json({
            status: true,
            message: scheduledDate ? "Newsletter scheduled successfully" : "Newsletter sent successfully",
            data: {
                newsletterId: newsletter.id,
                sentCount: newsletter.sentCount,
                failedCount: newsletter.failedCount,
                sentAt: newsletter.sentAt,
                status: newsletter.status
            }
        });
    } catch (error) {
        console.error("Newsletter send error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

// Save Newsletter Draft
router.post('/draft', authenticated, async (req, res) => {
    try {
        const {
            subject,
            content,
            htmlContent,
            template,
            sendToAll,
            recipients,
            scheduledDate
        } = req.body;

        const draft = await Newsletter.create({
            subject,
            content,
            htmlContent,
            template,
            sendToAll,
            recipients: sendToAll ? [] : recipients,
            scheduledDate,
            status: 'draft'
        });

        res.json({
            status: true,
            message: "Newsletter draft saved successfully",
            data: {
                draftId: draft.id,
                subject: draft.subject,
                createdAt: draft.createdAt,
                updatedAt: draft.updatedAt,
                status: draft.status
            }
        });
    } catch (error) {
        console.error("Newsletter draft save error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

// Get Newsletter Drafts
router.get('/drafts', authenticated, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const { count, rows: drafts } = await Newsletter.findAndCountAll({
            where: {
                status: 'draft'
            },
            order: [['updatedAt', 'DESC']],
            limit,
            offset
        });

        res.json({
            status: true,
            message: "Newsletter drafts retrieved successfully",
            data: {
                drafts,
                pagination: {
                    totalItems: count,
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    itemsPerPage: limit,
                    hasNextPage: page < Math.ceil(count / limit),
                    hasPrevPage: page > 1
                }
            }
        });
    } catch (error) {
        console.error("Newsletter drafts fetch error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

// Update Newsletter Draft
router.put('/draft/:draftId', authenticated, async (req, res) => {
    try {
        const { draftId } = req.params;
        const {
            subject,
            content,
            htmlContent,
            template,
            sendToAll,
            recipients,
            scheduledDate
        } = req.body;

        const draft = await Newsletter.findOne({
            where: {
                id: draftId,
                status: 'draft'
            }
        });

        if (!draft) {
            return res.status(404).json({
                status: false,
                message: "Draft not found"
            });
        }

        await draft.update({
            subject,
            content,
            htmlContent,
            template,
            sendToAll,
            recipients: sendToAll ? [] : recipients,
            scheduledDate
        });

        res.json({
            status: true,
            message: "Newsletter draft updated successfully",
            data: {
                draftId: draft.id,
                subject: draft.subject,
                updatedAt: draft.updatedAt,
                status: draft.status
            }
        });
    } catch (error) {
        console.error("Newsletter draft update error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

// Delete Newsletter Draft
router.delete('/draft/:draftId', authenticated, async (req, res) => {
    try {
        const { draftId } = req.params;

        const draft = await Newsletter.findOne({
            where: {
                id: draftId,
                status: 'draft'
            }
        });

        if (!draft) {
            return res.status(404).json({
                status: false,
                message: "Draft not found"
            });
        }

        await draft.destroy();

        res.json({
            status: true,
            message: "Newsletter draft deleted successfully",
            data: {
                draftId,
                deletedAt: new Date()
            }
        });
    } catch (error) {
        console.error("Newsletter draft delete error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

// Get Newsletter History
router.get('/history', authenticated, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const { count, rows: newsletters } = await Newsletter.findAndCountAll({
            where: {
                status: 'sent'
            },
            order: [['sentAt', 'DESC']],
            limit,
            offset
        });

        res.json({
            status: true,
            message: "Newsletter history retrieved successfully",
            data: {
                newsletters,
                pagination: {
                    totalItems: count,
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    itemsPerPage: limit,
                    hasNextPage: page < Math.ceil(count / limit),
                    hasPrevPage: page > 1
                }
            }
        });
    } catch (error) {
        console.error("Newsletter history fetch error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

// Get Email Subscribers
router.get('/subscribers', authenticated, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';

        const whereClause = search ? {
            [Op.or]: [
                { email: { [Op.iLike]: `%${search}%` } },
                { name: { [Op.iLike]: `%${search}%` } }
            ]
        } : {};

        const { count, rows: subscribers } = await Subscriber.findAndCountAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        // Get subscriber statistics
        const stats = await Subscriber.findAll({
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalSubscribers'],
                [sequelize.fn('COUNT', sequelize.literal('CASE WHEN "subscribed" = true THEN 1 END')), 'activeSubscribers'],
                [sequelize.fn('COUNT', sequelize.literal('CASE WHEN "subscribed" = false THEN 1 END')), 'unsubscribed'],
                [sequelize.fn('AVG', sequelize.literal('CASE WHEN "emailsReceived" > 0 THEN CAST("emailsOpened" AS FLOAT) / "emailsReceived" * 100 ELSE 0 END')), 'averageOpenRate'],
                [sequelize.fn('AVG', sequelize.literal('CASE WHEN "emailsReceived" > 0 THEN CAST("emailsClicked" AS FLOAT) / "emailsReceived" * 100 ELSE 0 END')), 'averageClickRate']
            ]
        });

        res.json({
            status: true,
            message: "Email subscribers retrieved successfully",
            data: {
                subscribers,
                pagination: {
                    totalItems: count,
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    itemsPerPage: limit,
                    hasNextPage: page < Math.ceil(count / limit),
                    hasPrevPage: page > 1
                },
                stats: stats[0].get()
            }
        });
    } catch (error) {
        console.error("Subscribers fetch error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

// Add Email Subscriber
router.post('/subscribers', authenticated, async (req, res) => {
    try {
        const { email, name, source, tags, subscribed } = req.body;

        if (!email) {
            return res.status(400).json({
                status: false,
                message: "Email is required"
            });
        }

        const subscriber = await Subscriber.create({
            email,
            name,
            source,
            tags,
            subscribed,
            subscribedAt: subscribed ? new Date() : null
        });

        res.json({
            status: true,
            message: "Email subscriber added successfully",
            data: subscriber
        });
    } catch (error) {
        console.error("Subscriber add error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

// Update Email Subscriber
router.put('/subscribers/:subscriberId', authenticated, async (req, res) => {
    try {
        const { subscriberId } = req.params;
        const { name, subscribed, tags } = req.body;

        const subscriber = await Subscriber.findByPk(subscriberId);

        if (!subscriber) {
            return res.status(404).json({
                status: false,
                message: "Subscriber not found"
            });
        }

        const updates = {
            name,
            tags,
            subscribed,
            unsubscribedAt: subscribed === false ? new Date() : null
        };

        await subscriber.update(updates);

        res.json({
            status: true,
            message: "Email subscriber updated successfully",
            data: subscriber
        });
    } catch (error) {
        console.error("Subscriber update error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

// Get Newsletter Analytics
router.get('/analytics', authenticated, async (req, res) => {
    try {
        const period = req.query.period || '30days';
        const days = parseInt(period) || 30;

        const query = `
            WITH daily_stats AS (
                SELECT 
                    DATE(n."sentAt") as date,
                    COUNT(DISTINCT n.id) as newsletters_sent,
                    SUM(n."sentCount") as emails_sent,
                    SUM(n."sentCount" - n."failedCount") as emails_delivered,
                    SUM(n."sentCount" * n."openRate" / 100) as emails_opened,
                    SUM(n."sentCount" * n."clickRate" / 100) as emails_clicked,
                    COUNT(DISTINCT CASE WHEN s."unsubscribedAt" >= DATE(n."sentAt") THEN s.id END) as unsubscribes
                FROM newsletters n
                LEFT JOIN subscribers s ON DATE(s."unsubscribedAt") = DATE(n."sentAt")
                WHERE n."sentAt" >= CURRENT_DATE - INTERVAL '${days} days'
                GROUP BY DATE(n."sentAt")
            ),
            top_newsletters AS (
                SELECT 
                    n.id,
                    n.subject,
                    n."sentAt",
                    n."openRate",
                    n."clickRate",
                    n."sentCount"
                FROM newsletters n
                WHERE n."sentAt" >= CURRENT_DATE - INTERVAL '${days} days'
                AND n.status = 'sent'
                ORDER BY n."openRate" DESC
                LIMIT 5
            )
            SELECT 
                (SELECT json_build_object(
                    'period', '${period}',
                    'totalNewslettersSent', SUM(newsletters_sent),
                    'totalEmailsSent', SUM(emails_sent),
                    'totalEmailsDelivered', SUM(emails_delivered),
                    'totalEmailsOpened', SUM(emails_opened),
                    'totalEmailsClicked', SUM(emails_clicked),
                    'totalUnsubscribes', SUM(unsubscribes),
                    'averageOpenRate', AVG(emails_opened::float / NULLIF(emails_delivered, 0) * 100),
                    'averageClickRate', AVG(emails_clicked::float / NULLIF(emails_delivered, 0) * 100),
                    'deliveryRate', AVG(emails_delivered::float / NULLIF(emails_sent, 0) * 100),
                    'unsubscribeRate', AVG(unsubscribes::float / NULLIF(emails_delivered, 0) * 100)
                ) FROM daily_stats) as summary,
                (SELECT json_agg(row_to_json(ds)) FROM daily_stats ds) as daily_stats,
                (SELECT json_agg(row_to_json(tn)) FROM top_newsletters tn) as top_performing_newsletters;
        `;

        const [analytics] = await Newsletter.sequelize.query(query, {
            type: QueryTypes.SELECT
        });

        res.json({
            status: true,
            message: "Newsletter analytics retrieved successfully",
            data: analytics
        });
    } catch (error) {
        console.error("Newsletter analytics fetch error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

// Get Newsletter Templates
router.get('/templates', authenticated, async (req, res) => {
    try {
        const templates = await NewsletterTemplate.findAll();

        res.json({
            status: true,
            message: "Newsletter templates retrieved successfully",
            data: {
                templates
            }
        });
    } catch (error) {
        console.error("Newsletter templates fetch error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

// Schedule Newsletter
router.post('/schedule', authenticated, async (req, res) => {
    try {
        const {
            subject,
            content,
            htmlContent,
            template,
            sendToAll,
            recipients,
            scheduledDate
        } = req.body;

        if (!scheduledDate) {
            return res.status(400).json({
                status: false,
                message: "Scheduled date is required"
            });
        }

        const newsletter = await Newsletter.create({
            subject,
            content,
            htmlContent,
            template,
            sendToAll,
            recipients: sendToAll ? [] : recipients,
            scheduledDate,
            status: 'scheduled'
        });

        res.json({
            status: true,
            message: "Newsletter scheduled successfully",
            data: {
                newsletterId: newsletter.id,
                scheduledDate: newsletter.scheduledDate,
                status: newsletter.status
            }
        });
    } catch (error) {
        console.error("Newsletter schedule error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

module.exports = router; 