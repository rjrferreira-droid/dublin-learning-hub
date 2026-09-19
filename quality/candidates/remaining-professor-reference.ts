/** Compatibility entry for the original sequences 5–8 offline candidate. */
import {prepareWrittenProfessorReference} from './written-professor-reference.ts';
export async function prepareRemainingProfessorReference(input:Parameters<typeof prepareWrittenProfessorReference>[0]){
 if(![5,6,7,8].includes(input.resolved.lesson.sequence))throw Error('future_reference_slug_sequence_mismatch');
 return prepareWrittenProfessorReference(input);
}
