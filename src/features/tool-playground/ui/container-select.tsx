import { CONTAINER_IDS, type ContainerId } from '@/mock-bridge/types';
import { Field, SelectInput } from '@/shared/ui/field';

interface ContainerSelectProps {
  id: string;
  value: ContainerId;
  onChange: (container: ContainerId) => void;
}

export function ContainerSelect({ id, value, onChange }: ContainerSelectProps) {
  return (
    <Field label="container" htmlFor={id}>
      <SelectInput id={id} value={value} onChange={(event) => onChange(event.target.value as ContainerId)}>
        {CONTAINER_IDS.map((container) => (
          <option key={container} value={container}>
            {container}
          </option>
        ))}
      </SelectInput>
    </Field>
  );
}
