import {
  acceptedMail,
  approveMail,
  denyMail,
  mailToNextReviewer,
  signedMail,
} from "@/constant/mailTemplate";
import { Announcement } from "@/models/announcementModel";
import { Application } from "@/models/applicationModel";
import { User } from "@/models/userModel";
import { sendEmail } from "./autoMailService";
import { ApplicationStates } from '@/constant/applicationState'
import { checkStatus, setNestedProperty } from "@/utils/roleHandler";

export default {
  approveProcedure: [
    "reviewer_1",
    "reviewer_2",
    "col_dean",
    "grant_dep",
    "grant_dir",
    "finance",
  ],
  roles: [
    { user: "User" },
    { reviewer_1: "Reviewer 1" },
    { reviewer_2: "Reviewer 2" },
    { col_dean: "College Dean" },
    { grant_dep: "Research and Extension Officer" },
    { grant_dir: "Research and Publication Directorate" },
    { finance: "Finance Director" },
  ],
  handleRequest: async function (id: string, role: string | null, flag: boolean) {
    if (role == null) throw new Error("Role validation Error")
    if (role === "user") throw new Error("You don't have permission");
    try {
      const application = (await Application.findOne({ _id: id })) as any;
      if (!application) {
        throw new Error("Application not found");
      }

      if (application[role] == ApplicationStates.APPROVED)
        throw new Error("You have already approved this application");
      if (application[role] == ApplicationStates.REJECTED)
        throw new Error("You have already rejected this application");
      if (application[this.approveProcedure[this.approveProcedure.indexOf(role) - 1]] == ApplicationStates.REJECTED)
        throw new Error("This application is rejected already.");

      const confirmData = this.checkProcedure(role, application);

      if (!confirmData.result) {
        if (confirmData.doubleError)
          throw new Error("Your action is already taken.");
        if (confirmData.rejected) throw new Error("This application has been rejected.");

        throw new Error("Your previous step was not performed.");
      }
      const statusKey = confirmData.key.includes('reviewer') ? `${confirmData.key}.status` : confirmData.key
      // console.log('status key: ', statusKey)
      // application[statusKey] = flag ? ApplicationStates.APPROVED : ApplicationStates.REJECTED;
      setNestedProperty(application, statusKey, flag ? ApplicationStates.APPROVED : ApplicationStates.REJECTED)
      await application.save();
      // flag && this.autoEmail(role, confirmData.key, application);
      // !flag && sendEmail(denyMail(application.email));
      return application;
    } catch (error) {
      throw error;
    }
  },
  checkProcedure(role: string, data: any): Record<string, any> {
    if (role === this.approveProcedure[0]) {
      if (data['assigned'] == ApplicationStates.APPROVED) return { result: true, key: role }
      if (data['assigned'] == ApplicationStates.REJECTED) return { result: false, rejected: true }
      return { result: false }
    } else if (
      role === this.approveProcedure[1] // not check procedure on review 2
    ) {
      return { result: true, key: role }
    } else if (
      checkStatus(data[this.approveProcedure[this.approveProcedure.indexOf(role) - 1]], ApplicationStates.PENDING)
    ) {
      return { result: false };
    } else if (
      checkStatus(data[this.approveProcedure[this.approveProcedure.indexOf(role) - 1]], ApplicationStates.REJECTED)
    ) {
      return { result: false };
    } else if (
      checkStatus(data[this.approveProcedure[this.approveProcedure.indexOf(role) - 1]], ApplicationStates.APPROVED)
    ) {
      if (checkStatus(data[role], ApplicationStates.PENDING)) {
        return { result: true, key: role };
      } else {
        return { result: false, doubleError: true };
      }
    }
    return { result: false };
  },
  autoEmail: async function (role: string, process: string, application: any) {
    const nextRole =
      this.approveProcedure[this.approveProcedure.indexOf(role) + 1];
    try {
      if (process === "assigned") {
        sendEmail(signedMail(application.email));
      }
      if (nextRole === "accepted") {
        sendEmail(acceptedMail(application.email));
        return;
      }
      const user = await User.findOne({
        college: application.college,
        role: nextRole,
      });
      if (!user?.email) throw new Error("No user for next reviewing.");
      await sendEmail(
        mailToNextReviewer(
          user?.email,
          application.firstName + " " + application.lastName
        )
      );
      const roleData = this.roles.find(
        (item) => Object.keys(item)[0] === role
      ) as any;

      roleData &&
        (await sendEmail(approveMail(application.email, roleData[role])));

      return;
    } catch (error) {
      throw error;
    }
  },
};
