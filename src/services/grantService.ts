import {
  acceptedMail,
  approveMail,
  denyMail,
  mailToNextReviewer,
  signedMail,
} from "@/constant/mailTemplate";
import { Announcement } from "@/models/announcementModel";
import { Application } from "@/models/applicationModel";
import { ApplicationStates } from '@/constant/applicationState'
import { checkStatus, setNestedProperty } from "@/utils/roleHandler";
import sendEmail from "./mailjetService";

export default {
  approveProcedure: [
    "reviewer_1",
    "reviewer_2",
    "col_dean",
    "grant_dep",
    "grant_dir",
    "finance",
  ] as string[],
  roles: {
    col_dean: "College Dean",
    grant_dep: "Research and Extension Officer",
    grant_dir: "Research and Pbblication Directorate",
    finance: "Finance Director"
  } as Record<string, string>,
  adminRole: [
    "col_dean",
    "grant_dep",
    "grant_dir",
    "finance"
  ] as string[],
  handleRequest: async function (id: string, role: string | null, reqStatus: string) {
    if (role == null) throw new Error("Role validation Error")
    if (role === "user") throw new Error("You don't have permission");
    try {
      const application = (await Application.findOne({ _id: id })) as any;
      if (!application) {
        throw new Error("Application not found");
      }

      let status = application[role];
      if (role.includes('reviewer')) { // check if reviewer_1 or reviewer_2
        status = application[role]['status'];
      }

      if (status === ApplicationStates.REVIEWED && reqStatus === ApplicationStates.REVIEWED)
        throw new Error("You have already reviewed this application")
      if (status === ApplicationStates.APPROVED && reqStatus === ApplicationStates.APPROVED)
        throw new Error("You have already approved this application");
      if (status === ApplicationStates.REJECTED)
        throw new Error("You have already rejected this application");
      if (application[this.approveProcedure[this.approveProcedure.indexOf(role) - 1]] == ApplicationStates.REJECTED)
        throw new Error("This application is rejected already.");

      const confirmData = this.checkProcedure(role, application, reqStatus);

      if (!confirmData.result) {
        if (confirmData.doubleError)
          throw new Error("Your action is already taken.");
        if (confirmData.rejected)
          throw new Error("This application has been rejected.");

        throw new Error("Your previous step was not performed.");
      }
      const statusKey = confirmData.key.includes('reviewer') ? `${confirmData.key}.status` : confirmData.key
      // console.log('status key: ', statusKey)
      // application[statusKey] = flag ? ApplicationStates.APPROVED : ApplicationStates.REJECTED;
      setNestedProperty(application, statusKey, reqStatus);
      const announcement = await Announcement.findById(application.announcement);

      await application.save();
      if (this.adminRole.includes(role)) {
        const toEmail = application.email;
        const toName = application.firstName + " " + application.lastName;
        const milestone = application.milestone;
        const announcementTitle = announcement?.title || "";
        const adminRoleInfo = this.roles[role];
        sendEmail(toEmail, toName, reqStatus, milestone, announcementTitle, adminRoleInfo);
      }
      // flag && this.autoEmail(role, confirmData.key, application);
      // !flag && sendEmail(denyMail(application.email));
      return application;
    } catch (error) {
      throw error;
    }
  },
  checkProcedure(role: string, data: any, reqStatus: string): Record<string, any> {
    const currentRoleIndex = this.approveProcedure.indexOf(role);
    const previousRole = this.approveProcedure[currentRoleIndex - 1];

    if (role === this.approveProcedure[0]) {
      if (data['assigned'] == ApplicationStates.APPROVED) return { result: true, key: role }
      if (data['assigned'] == ApplicationStates.REJECTED) return { result: false, rejected: true }
      return { result: false }
    }

    // Handling for the second role (review 2) - not check procedure on review 2
    if ( role === this.approveProcedure[1]) {
      return { result: true, key: role }
    }
    
    // col dean restriction
    if ( role === this.approveProcedure[2] ) {
      // not check procedure on col dean of milestone 2, 3 and not review request
      const isMilestoneCheck = reqStatus !== ApplicationStates.REVIEWED && data['milestone'] !== 1;
      // not check procedure on col dean of user reviewed and not review request
      const isReviewedCheck = reqStatus === ApplicationStates.REVIEWED && data['reviewed'] === ApplicationStates.REVIEWED;
      
      if (isMilestoneCheck || isReviewedCheck) {
        return { result: true, key: role }
      }
    }
    
    // finance checking procedure
    // if (role === this.approveProcedure[5] ) {
    //   if (checkStatus(data[previousRole], ApplicationStates.REVIEWED)) {
    //     // previous role's status is reivewed - true
    //     return { result: true, key: role }
    //   }
    //   // not upper case - false
    //   return { result: false }
    // }
    
    // Check for pending, rejected, or approved statuses of the previous role
    if ( checkStatus(data[previousRole], ApplicationStates.PENDING) || checkStatus(data[previousRole], ApplicationStates.REJECTED)) {
      return { result: false };
    }
    
    if (checkStatus(data[previousRole], ApplicationStates.APPROVED)) {
      if (reqStatus === ApplicationStates.REVIEWED) {
        return { result: false }
      }
      if (checkStatus(data[role], ApplicationStates.PENDING)) {
        return { result: true, key: role };
      }
      
      return { result: false, doubleError: true };
    } 
    
    if (checkStatus(data[previousRole], ApplicationStates.REVIEWED)) {
      if (checkStatus(data[role], ApplicationStates.APPROVED) && (checkStatus(reqStatus, ApplicationStates.REVIEWED))) {
        return { result: true, key: role }
      }
      if (checkStatus(data[role], ApplicationStates.REVIEWED)){
        return { result: false, doubleError: true }
      }
      return { result: false }
    }
    return { result: false };
  },
  // autoEmail: async function (role: string, process: string, application: any) {
  //   const nextRole =
  //     this.approveProcedure[this.approveProcedure.indexOf(role) + 1];
  //   try {
  //     if (process === "assigned") {
  //       sendEmail(signedMail(application.email));
  //     }
  //     if (nextRole === "accepted") {
  //       sendEmail(acceptedMail(application.email));
  //       return;
  //     }
  //     const user = await User.findOne({
  //       college: application.college,
  //       role: nextRole,
  //     });
  //     if (!user?.email) throw new Error("No user for next reviewing.");
  //     await sendEmail(
  //       mailToNextReviewer(
  //         user?.email,
  //         application.firstName + " " + application.lastName
  //       )
  //     );
  //     const roleData = this.roles.find(
  //       (item) => Object.keys(item)[0] === role
  //     ) as any;

  //     roleData &&
  //       (await sendEmail(approveMail(application.email, roleData[role])));

  //     return;
  //   } catch (error) {
  //     throw error;
  //   }
  // },
};
