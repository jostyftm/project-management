import BaseIcon from "../ui/base-icon";


interface LoadingPageProps {
  message?: string;
}

const LoadingPage = ({ message = "Cargando..." }: LoadingPageProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">{message}</h3>
        <BaseIcon
          name="LoaderCircle"
          size={30}
          className="text-center w-full animate-spin"
        />
      </div>
    </div>
  );
};

export default LoadingPage;
