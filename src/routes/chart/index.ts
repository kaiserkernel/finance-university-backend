import { collegeList } from "@/constant/collegeList";
import { Announcement } from "@/models/announcementModel";
import { Application } from "@/models/applicationModel";
import { Request, Response, Router } from "express";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
    try {
        const {xAxios, yAxios} = req.body;

        // validate requset body
        if (!xAxios || !yAxios) {
            res.status(400).json({success: false, message: "Please send requirement"});
        }

        let result;
        if (xAxios === 'college' && yAxios === 'budget') {
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
        } else if (xAxios === 'announcement' && yAxios === 'budget') {
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
        
        res.status(200).json({success: true, data: result});
    } catch (error) {
        console.log(error, 'fetch chart data error');
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
})

export { router as chartRouter };
