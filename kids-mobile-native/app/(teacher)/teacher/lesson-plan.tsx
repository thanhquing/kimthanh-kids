import { FeatureGate } from "@/components/auth/FeatureGate";
import LessonPlanScreen from "@/screens/teacher/LessonPlanScreen";

export default function TeacherLessonPlanRoute() {
  return (
    <FeatureGate featureKey="lesson_plan" role="teacher">
      <LessonPlanScreen />
    </FeatureGate>
  );
}
