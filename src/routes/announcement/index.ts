import { upload } from "@/middleware/multer";
import { Announcement } from "@/models/announcementModel";
import { Application } from "@/models/applicationModel";
import { Request, Response, Router } from "express";
import { isEmpty } from '@/utils/isEmpty';

const router = Router();

router.post("/all", async (req: any, res: Response) => {
  const {userEmail} = req.body;
  try {
    if (userEmail) {
      const result = await Announcement.aggregate([
        {
          $lookup: {
            from: "applications",
            localField: "_id",
            foreignField: "announcement",
            as: "applicationData"
          }
        },
        {
          $addFields: {
            filteredApplications: {
              $filter: {
                input: "$applicationData",
                as: "appData",
                cond: { $eq: ["$$appData.email", userEmail] }
              }
            }
          }
        },
        {
          $addFields: {
            invoice: {
              $gt: [
                { $size: { 
                    $filter: {
                      input: "$filteredApplications",
                      as: "appData",
                      cond: { $eq: ["$$appData.reviewed", "approved"] }
                    }
                  }
                },
                0
              ]
            },
            applyState: {
              $gt: [
                { $size: {
                    $filter: {
                      input: "$filteredApplications",
                      as: "appData",
                      cond: { $ne: ["$$appData.finance", "approved"] }
                    }
                  }
                },
                0
              ]
            },
            maxMilestone: {
              $ifNull: [
                {
                  $max: {
                    $map: {
                      input: "$filteredApplications",
                      as: "appData",
                      in: "$$appData.milestone"
                    }
                  }
                },
                0
              ]
            }
          }
        },
        {
          $project: {
            applicationData: 0,
            filteredApplications: 0 // Optionally remove this if not needed
          }
        }
      ]);
      console.log(result, 'res')
      res.status(200).json(result);
      return;
    } else {
      const result = await Announcement.find();
      res.status(200).json(result);
      return;
    }
  } catch (error) {
    console.log(error, "fetch all announcement error");
    res.status(400).json({msg: ["Fetch announcement occur error"]});
  }
});

router.get("/:id", (req: any, res: Response) => {
  Announcement.findById(req.params.id).then((announcements) => {
    if (isEmpty(announcements)) {
      res.status(404).json({ msg: ["No announcements"] });
    } else {
      // res.status(200).json(announcements);
      Application.find({ email: req.tokenUser.email, announcement: req.params.id })
        .then(applications => {
          if (isEmpty(applications)) {
            res.status(200).json({ stage: 0, budget: announcements?.budget })
          } else {
            res.status(200).json({ stage: applications.length, budget: announcements?.budget })
          }
        })
        .catch((error) => {
          res.status(500).json({ msg: [error.message] });
        });
    }
  }).catch((error) => {
    res.status(500).json({ msg: [error.message] });
  });
});

router.post("/", upload.single('image'), async (req: any, res: Response) => {
  if (req.tokenUser.role !== "grant_dir") {
    res.status(403).json({ msg: ["You do not have autherization for this route."] })
    return
  }

  const data = JSON.parse(req.body.data);
  const {title} = data;
  const existingAnnouncement = await Announcement.find({title});
  if (existingAnnouncement) {
    res.status(400).json({msg: ["Already existing announcement with same title"]});
    return;
  }
  
  const newAnnouncement = new Announcement(data);
  if (req.file) newAnnouncement.imageUrl = 'images/' + req.file.filename;

  try {
    const result = await newAnnouncement.save();
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ msg: [error] });
  }
})

router.put("/:id", async (req: any, res: Response) => {
  if (req.tokenUser.role !== "grant_dir") {
    res.status(403).json({ msg: ["You do not have autherization for this route."] })
    return
  }
  const id = req.params.id;
  const data = req.body;

})

export { router as announcementRouter };
