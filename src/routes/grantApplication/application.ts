import { application, Response, Router } from "express";
import { uploadApplication } from "@/middleware/multer";
import { Application } from "@/models/applicationModel";
import { confirmUserByEmail } from "@/utils/confirmUserByEmail";
import { isEmpty } from "@/utils/isEmpty";
import mongoose from 'mongoose';

const router = Router();

router.get("/", (req: any, res: Response) => {
  Application.find()
    .then((application) => {
      if (isEmpty(application)) {
        res.status(404).json({ msg: ["No application"] });
      } else {
        res.status(200).json(application);
      }
    })
    .catch((error) => {
      res.status(500).json({ msg: [error.message] });
    });
});

router.get("/:email", (req: any, res: Response) => {
  let query: any;
  confirmUserByEmail(req.params.email)
    .then((confirmedResult) => {
      if (!confirmedResult.confirmed)
        throw new Error("Your email is not available.");
      if (req.tokenUser.role === "user") {
        query = { email: req.params.email };
      } else if (req.tokenUser.role === "reviewer") {
        query = { college: confirmedResult.user?.college };
      }

      Application.find(query)
        .populate("comment")
        .populate("announcement")
        .populate("reviewer_1.user", '_id firstName lastName email role')
        .populate("reviewer_2.user", '_id firstName lastName email role')
        .then((application) => {
          // if (isEmpty(application)) {
          //   res.status(404).json({ msg: ["No application"] });
          // } else {
          const data = application.filter((applicationData: any) => {
            return req.tokenUser.email == applicationData.reviewer_1.user?.email || req.tokenUser.email == applicationData.reviewer_2.user?.email || req.tokenUser.role !== 'reviewer'
          })
          res.status(200).json(data);
          // }
        })
        .catch((error) => {
          res.status(500).json({ msg: [error.message] });
        });
    })
    .catch((error) => {
      res.status(500).json({ msg: [error.message] });
    });
});

router.post(
  "/:email",
  uploadApplication.fields([
    { name: "application", maxCount: 1 },
    { name: "applicationOne", maxCount: 1 }
  ]),
  async (req: any, res: Response) => {
    try {
      const { announcement, budget, milestone, currencyType } = JSON.parse(req.body.data);

      // Extract file paths with existence checks
      const applicationPath = req.files["application"] ? req.files["application"][0].filename : null;
      const applicationOnePath = req.files["applicationOne"] ? req.files["applicationOne"][0].filename : null;

      // Confirm user by email
      const response = await confirmUserByEmail(req.params.email);
      if (!response.confirmed) {
        console.log(1);
        res.status(403).json({ msg: "User not confirmed" });
        return;
      }

      const user = response.user;
      const prevMilestone = milestone - 1;

      // Check for existing application
      const existingApplication = await Application.findOne({
        email: user?.email,
        announcement,
        milestone: prevMilestone,
        finance: "approved"
      });

      if (!existingApplication) {
        res.status(400).json({ msg: ["Previous application are not approved"] });
        return;
      }

      // Prepare new application data
      const data = {
        email: user?.email,
        enrollment: user?.enrollment,
        firstName: user?.firstName,
        lastName: user?.lastName,
        college: user?.college,
        application: applicationPath,
        applicationOne: applicationOnePath,
        announcement,
        budget,
        milestone,
        currencyType,
      };

      // Save new application
      const newApplication = new Application(data);
      await newApplication.save();
      res.status(200).json({ msg: "Application saved" });
    } catch (error) {
      console.log(error, 'create application error');
      res.status(400).json({msg: ["Crate application occur error"]});
    }
  }
);

router.get("/invoice/:announcementId", (req: any, res: Response) => {
  const user = req.tokenUser;
  const announcementId = new mongoose.Types.ObjectId(req.params.announcementId);

  Application.aggregate([
    {
      $match: {
        $and: [
          { announcement: announcementId },
          { email: user.email }
        ]
      }
    },
    {
      $project: {
        _id: 1,
        createdAt: 1,
        budget: 1,
        milestone: 1
      }
    }
  ])
    .then(results => {
      return res.status(200).json({success: true, data: results})
    })
    .catch(error => {
      res.status(404).json({success: false, msg: [error.message]});
    })
})

export { router as applicationRouter };
