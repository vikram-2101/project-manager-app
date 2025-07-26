// components/CreateProjectForm.jsx
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "react-toastify";

const schema = yup
  .object({
    name: yup.string().required("Project name is required"),
    description: yup.string().required("Description is required"),
    type: yup.string().required("Project type is required"),
    clientName: yup.string(),
    startDate: yup.date().required("Start date is required"),
    endDate: yup.date(),
    deadline: yup.date(),
    projectManager: yup.string().required("Select project manager"),
    teamMembers: yup.array().min(1, "Select at least one team member"),
    priority: yup.string().required(),
    access: yup.string().required(),
    tags: yup.string(),
  })
  .required();

export default function CreateProjectForm() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    // Format teamMembers if needed
    data.teamMembers = data.teamMembers.filter((member) => member);
    console.log(data); // Replace with your API call
    try {
      // Simulate API call
      await new Promise((res) => setTimeout(res, 1000));

      // Show success toast
      toast.success("🎉 Project created successfully!");

      // You can also reset the form here if needed
      // reset();
    } catch (error) {
      console.error(error);
      toast.error("❌ Failed to create project. Please try again.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-2xl mx-auto p-6 bg-white dark:bg-zinc-900 shadow-md rounded-lg space-y-4"
    >
      <h2 className="text-2xl font-semibold mb-4 text-zinc-800 dark:text-white">
        Create Project
      </h2>

      {/* Project Name */}
      <div>
        <label className="block font-medium">Project Name</label>
        <input
          {...register("name")}
          placeholder="e.g. Favian Dashboard"
          className="input"
        />
        <p className="text-red-500 text-sm">{errors.name?.message}</p>
      </div>

      {/* Description */}
      <div>
        <label className="block font-medium">Description</label>
        <textarea
          {...register("description")}
          placeholder="Brief project overview"
          className="input h-24"
        />
        <p className="text-red-500 text-sm">{errors.description?.message}</p>
      </div>

      {/* Type */}
      <div>
        <label className="block font-medium">Project Type</label>
        <select {...register("type")} className="input">
          <option value="">Select type</option>
          <option value="Software">Software</option>
          <option value="Research">Research</option>
          <option value="Marketing">Marketing</option>
        </select>
        <p className="text-red-500 text-sm">{errors.type?.message}</p>
      </div>

      {/* Client Name */}
      <div>
        <label className="block font-medium">Client Name</label>
        <input
          {...register("clientName")}
          placeholder="Optional client name"
          className="input"
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block font-medium">Start Date</label>
          <input type="date" {...register("startDate")} className="input" />
          <p className="text-red-500 text-sm">{errors.startDate?.message}</p>
        </div>
        <div>
          <label className="block font-medium">End Date</label>
          <input type="date" {...register("endDate")} className="input" />
        </div>
        <div>
          <label className="block font-medium">Deadline</label>
          <input type="date" {...register("deadline")} className="input" />
        </div>
      </div>

      {/* Project Manager */}
      <div>
        <label className="block font-medium">Project Manager</label>
        <select {...register("projectManager")} className="input">
          <option value="">Select a manager</option>
          <option value="vikram_id">Vikram Kumar</option>
          <option value="user123">Another User</option>
        </select>
        <p className="text-red-500 text-sm">{errors.projectManager?.message}</p>
      </div>

      {/* Team Members */}
      <div>
        <label className="block font-medium">Team Members</label>
        <div className="space-y-2">
          <label>
            <input type="checkbox" value="user1" {...register("teamMembers")} />{" "}
            Alice
          </label>
          <br />
          <label>
            <input type="checkbox" value="user2" {...register("teamMembers")} />{" "}
            Bob
          </label>
          <br />
          <label>
            <input type="checkbox" value="user3" {...register("teamMembers")} />{" "}
            Charlie
          </label>
        </div>
        <p className="text-red-500 text-sm">{errors.teamMembers?.message}</p>
      </div>

      {/* Priority & Access */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-medium">Priority</label>
          <select {...register("priority")} className="input">
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
            <option value="Low">Low</option>
          </select>
        </div>
        <div>
          <label className="block font-medium">Access</label>
          <select {...register("access")} className="input">
            <option value="Private">Private</option>
            <option value="Public">Public</option>
          </select>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block font-medium">Tags</label>
        <input
          {...register("tags")}
          placeholder="e.g. #UI #Solana #MERN"
          className="input"
        />
      </div>

      {/* Submit Button */}
      <div className="text-right">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Create Project
        </button>
      </div>
    </form>
  );
}
