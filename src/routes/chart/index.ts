import { collegeList } from "@/constant/collegeList";
import { Announcement } from "@/models/announcementModel";
import { Application } from "@/models/applicationModel";
import { Response, Router } from "express";

const router = Router();

const allowedRoles = ['col_dean', 'grant_dep', 'grant_dir', 'finance'];

router.post("/", async (req: any, res: Response) => {
    try {
        const { axis } = req.body;
        
        const user = req.tokenUser;

        // validate requset body
        if (!axis) {
            res.status(400).json({success: false, msg: ["Please send requirement"]});
            return;
        }

        let result;
        
        if(user.role === 'grant_dep' || user.role === 'grant_dir' || user.role === 'finance') {
            if (axis === 'college') {
                result = await Application.aggregate([
                    {
                        $match: { finance: 'approved' }
                    },
                    {
                        $group: {
                            _id: "$college",
                            totalBudget: { $sum: "$budget" }
                        }
                    },
                    {
                        $project: {
                            content: "$_id",
                            totalBudget: 1,
                            _id: 0
                        }
                    }
                ]);
    
                const collegeListMap = new Map<string, string>();
                collegeList.forEach(college => collegeListMap.set(college.value, college.name));
                
                result = result.map(log => {
                    const title = collegeListMap.get(log.content);
                    return {
                        ...log,
                        title
                    }
                })
            } else if (axis === 'announcement') {
                result = await Application.aggregate([
                    {
                        $match: { finance: 'approved' }
                    },
                    {
                        $group: {
                            _id: "$announcement",
                            totalBudget: { $sum: "$budget" }
                        }
                    },
                    {
                        $lookup: {
                            from: "announcements",
                            localField: "_id",
                            foreignField: "_id",
                            as: "announcementData"
                        }
                    },
                    {
                        $unwind: "$announcementData" // convert array to object
                    },
                    {
                        $project: {
                            _id: 0,
                            totalBudget: 1,
                            title: "$announcementData.title"
                        }
                    }
                ])
            }
        } else {
            res.status(400).json({success: false, msg: ["You are not allowed"]});
        }
        
        res.status(200).json({success: true, data: result});
        return;
    } catch (error) {
        console.log(error, 'fetch chart data error');
        res.status(500).json({ success: false, msg: ["Fetch chart data occur error"]});
    }
})

router.post("/college/:college", async(req: any, res: Response) => {
    const collegeListMap = new Map<string, string>();
    collegeList.forEach(college => collegeListMap.set(college.name, college.value));

    if (!req.params.college) {
        res.status(400).json({success: false, msg: ["Please select college"]});
        return;
    }

    const selectedCollege = collegeListMap.get(req.params.college);
    if (!selectedCollege) {
        res.status(400).json({success: false, msg: ["Please select correct college"]});
        return;
    }
    
    try {
        const { role } = req.tokenUser;
        if (!allowedRoles.includes(role)) {
            res.status(400).json({success: false, msg: ["You are not allowed"]})
        }

        const result = await Application.aggregate([
            {
                $match: {
                    $and: [
                        { finance: 'approved' },
                        { college: selectedCollege }
                    ]
                }
            },
            {
                $group: {
                    _id: {
                        enrollment: "$enrollment",
                        firstName: "$firstName",
                        lastName: "$lastName"
                    },
                    totalBudget: { $sum: "$budget" }
                }
            },
            {
                $project: {
                    totalBudget: 1,
                    title: {
                        $concat: [
                            "$_id.firstName",
                            " ",
                            "$_id.lastName"
                        ]
                    },
                    _id: 0
                }
            }
        ]);
        res.status(200).json({success: true, data: result});
        return;
    } catch (error) {
        console.log(error, 'fetch chart data for college');
        res.status(500).json({ success: false, msg: ["Fetch chart data for college occur error"] });
    }
})

router.post("/announcement/:announcement", async(req: any, res: Response) => {
    if (!req.params.announcement) {
        res.status(400).json({success: false, msg: ["Please select college"]});
        return;
    }
    
    try {
        const { role } = req.tokenUser;
        if (!allowedRoles.includes(role)) {
            res.status(400).json({success: false, msg: ["You are not allowed"]})
            return;
        }

        const result = await Application.aggregate([
            {
                $match: { finance: 'approved' }
            },
            {
                $lookup: {
                    from: "announcements",
                    localField: "announcement",
                    foreignField: "_id",
                    as: "announcementData"
                }
            },
            {
                $unwind: "$announcementData"
            },
            {
                $match: { "announcementData.title": req.params.announcement }
            },
            {
                $group: {
                    _id: {
                        enrollment: "$enrollment",
                        firstName: "$firstName",
                        lastName: "$lastName"
                    },
                    totalBudget: { $sum: "$budget" }
                }
            },
            {
                $project: {
                    totalBudget: 1,
                    title: {
                        $concat: [
                            "$_id.firstName",
                            " ",
                            "$_id.lastName"
                        ]
                    },
                    _id: 0
                }
            }
        ]);
        
        res.status(200).json({success: true, data: result});
        return;
    } catch (error) {
        console.log(error, 'fetch chart data for college');
        res.status(500).json({ success: false, msg: ["Fetch chart data for announcement occur error"] });
    }
})

export { router as chartRouter };
