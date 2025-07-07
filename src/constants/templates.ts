export const templates = [
  {
    id: "blank",
    label: "Blank Document",
    imageUrl: "/blank-document.svg",
    initialContent: "",
  },
  {
    id: "software-proposal",
    label: "Software Proposal",
    imageUrl: "/software-proposal.svg",
    initialContent: `
      <h1>Software Development Proposal</h1>
      <h2>Project Overview</h2>
      <p>Brief description of the proposed software development project.</p>
      <h2>Scope of Work</h2>
      <p>Details about the scope of work to be performed.</p>
      <h2>Timeline</h2>
      <p>Project timeline and milestones.</p>
      <h2>Budget</h2>
      <p>Budget breakdown and cost estimates.</p>
    `,
  },
  {
    id: "project-proposal",
    label: "Project Proposal",
    imageUrl: "/project-proposal.svg",
    initialContent: `
      <h1>Project Proposal</h1>
      <h2>Overview</h2>
      <p>Brief description of the project's purpose and objectives.</p>
      <h2>Goals and Objectives</h2>
      <p>Detailed information about project goals and expected outcomes.</p>
      <h2>Required Resources</h2>
      <p>Information about the resources and tools needed.</p>
      <h2>Expected Results</h2>
      <p>Description of benefits and expected project outcomes.</p>
    `,
  },
  {
    id: "business-letter",
    label: "Business Letter",
    imageUrl: "/business-letter.svg",
    initialContent: `
      <h1>Business Letter</h1>
      <h2>Introduction</h2>
      <p>Company introduction and purpose of the letter.</p>
      <h2>Products/Services</h2>
      <p>Brief description of products or services offered.</p>
      <h2>Benefits</h2>
      <p>Key advantages and benefits of working with the company.</p>
      <h2>Closing</h2>
      <p>Thank you note and invitation for contact or meeting.</p>
    `,
  },
  {
    id: "cover-letter",
    label: "Cover Letter",
    imageUrl: "/cover-letter.svg",
    initialContent: `
      <h1>Cover Letter</h1>
      <p>Your Name<br/>
      Your Address<br/>
      City, State ZIP Code<br/>
      Email Address<br/>
      Phone Number</p>
      
      <p>Date</p>
      
      <p>Hiring Manager<br/>
      Company Name<br/>
      Company Address</p>
      
      <p>Dear Hiring Manager,</p>
      
      <p>I am writing to express my interest in the [Position Title] role at [Company Name]. With my background in [Your Field], I am confident that I would be a valuable addition to your team.</p>
      
      <p>In my previous role at [Previous Company], I [specific achievement or responsibility]. This experience has prepared me well for the challenges of this position.</p>
      
      <p>I would welcome the opportunity to discuss how my skills and experience can contribute to [Company Name]. Thank you for your consideration.</p>
      
      <p>Sincerely,<br/>
      Your Name</p>
    `,
  },
  {
    id: "resume",
    label: "Resume",
    imageUrl: "/resume.svg",
    initialContent: `
      <h1>Your Name</h1>
      <p>Phone: (555) 123-4567 | Email: your.email@example.com | Address: Your City, State</p>
      
      <h2>Professional Summary</h2>
      <p>Brief overview of your professional background and key qualifications.</p>
      
      <h2>Skills</h2>
      <ul>
        <li>Skill 1</li>
        <li>Skill 2</li>
        <li>Skill 3</li>
      </ul>
      
      <h2>Experience</h2>
      <h3>Job Title - Company Name (Start Date - End Date)</h3>
      <ul>
        <li>Key responsibility or achievement</li>
        <li>Another significant accomplishment</li>
      </ul>
      
      <h2>Education</h2>
      <h3>Degree - University Name (Graduation Year)</h3>
      
      <h2>Awards & Certifications</h2>
      <p>Notable achievements or professional certifications.</p>
    `,
  },
]; 