import * as icons from "lucide-react";
import React from "react";

// Tipo para las propiedades de los iconos de Lucide
type LucideIconProps = React.ComponentProps<typeof icons.AlertCircle>;

// Tipo para los nombres de los iconos
export type IconName = keyof typeof icons;

// Propiedades para nuestro componente BaseIcon
interface BaseIconProps extends Omit<LucideIconProps, "ref"> {
	name: IconName;
}

const BaseIcon = React.memo<BaseIconProps>(({ name, ...props }) => {
	const LucideIcon = icons[name] as React.ComponentType<LucideIconProps>;

	if (!LucideIcon) {
		console.warn(`Icon "${name}" not found in Lucide React`);
		return null;
	}

	return <LucideIcon {...props} />;
});

// ✅ Necesario para evitar error de ESLint
BaseIcon.displayName = "BaseIcon";

export default BaseIcon;
