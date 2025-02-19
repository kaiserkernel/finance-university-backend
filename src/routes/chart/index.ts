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

        if (xAxios === 'college' && yAxios === 'budget') {
            const result = await Application.aggregate([
                {
                    $match: { finance: 'approved' }
                },
                {
                    $group: {
                        _id: "$college",
                        totalBudget: { $sum: "$budget" }
                    }
                }
            ]);
            console.log(result, 'result')
            res.status(200).json({success: true, data: result});
        }
    } catch (error) {
        console.log(error, 'fetch chart data error');
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
})

export { router as chartRouter };
