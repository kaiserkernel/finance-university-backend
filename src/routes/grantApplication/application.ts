import { application, Response, Router } from "express";
import { uploadApplication } from "@/middleware/multer";
import { Application } from "@/models/applicationModel";
import { confirmUserByEmail } from "@/utils/confirmUserByEmail";
import { isEmpty } from "@/utils/isEmpty";

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
  (req: any, res: Response) => {

    const { announcement, budget, milestone, currencyType } = JSON.parse(req.body.data)

    // Extract file paths
    const applicationPath = req.files["application"][0].filename;
    const applicationOnePath = req.files["applicationOne"]
      ? req.files["applicationOne"][0].filename
      : null; // Optional file
      
    confirmUserByEmail(req.params.email)
      .then((response) => {
        if (response.confirmed) {
          const user = response.user;
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
          const newApplication = new Application(data);

          newApplication
            .save()
            .then(() => {
              res.status(200).json({ msg: "Application saved" })
            })
            .catch((error) => res.status(500).json({ msg: [error.message] }));
        }
      })
      .catch((error) => {
        res.status(404).json({ msg: [error.message] });
      });
  }
);

export { router as applicationRouter };
