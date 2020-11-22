import { MutableRefObject, useEffect, useRef, useState } from 'react';
import {
    Nullable,
    Observer,
    EventState,
    ActionManager,
    ActionEvent,
    ExecuteCodeAction,
    Mesh,
    IAction,
} from '@babylonjs/core';
import { Control } from '@babylonjs/gui/2D/controls/control';

import { ICustomPropsHandler, CustomPropsHandler } from '../PropsHandler';
import { DecoratedInstance } from "../DecoratedInstance";

export const useCustomPropsHandler = (propsHandler: ICustomPropsHandler<any, any>/*, deps?: React.DependencyList | undefined*/): void => {
    const firstRun = useRef<boolean>(true);

    if (firstRun.current === true) {
        CustomPropsHandler.RegisterPropsHandler(propsHandler);
        firstRun.current = false;
    }

    useEffect(() => {
        return () => {
            // console.warn('de-registering on unmount', propsHandler.name);
            CustomPropsHandler.UnregisterPropsHandler(propsHandler);
        }
    }, [])
}

export type MeshEventType = {
    (ev: ActionEvent): void
}

export type Gui2dEventType = {
    (eventData: Control, eventState: EventState): void
}

export type HoverType = MeshEventType | Gui2dEventType;

/**
 * useHover hook
 * 
 * TODO: support GUI 3D contols
 *
 * @param over expression when hover over starts
 * @param out expression when hover stops
 */
export const useHover = (over?: HoverType, out?: HoverType): [MutableRefObject<DecoratedInstance<Mesh | Control | null>>, boolean] => {
    const [value, setValue] = useState(false);

    const ref = useRef<DecoratedInstance<Mesh>>(null) as MutableRefObject<DecoratedInstance<Mesh | Control | null>>;

    useEffect(() => {
        if (ref.current) {
            const registeredMeshActions: Nullable<IAction>[] = [];
            let observer2dGuiEnter: Nullable<Observer<Control>> = null;
            let observer2dGuiOut: Nullable<Observer<Control>> = null;

            if (ref.current.__rbs.metadata.isMesh === true) {
                const mesh = ref.current as Mesh;

                if (!mesh.actionManager) {
                    mesh.actionManager = new ActionManager(mesh.getScene());
                }

                const onPointerOverAction: Nullable<IAction> = mesh.actionManager.registerAction(
                    new ExecuteCodeAction(
                        ActionManager.OnPointerOverTrigger, (ev: any) => {
                            over && (over as MeshEventType)(ev);
                            setValue(true);
                        }
                    )
                );

                const onPointerOutAction: Nullable<IAction> = mesh.actionManager.registerAction(
                    new ExecuteCodeAction(
                        ActionManager.OnPointerOutTrigger, (ev: any) => {
                            out && (out as MeshEventType)(ev);
                            setValue(false);
                        }
                    )
                );

                registeredMeshActions.push(onPointerOverAction);
                registeredMeshActions.push(onPointerOutAction);
            } else if (ref.current.__rbs.metadata.isGUI2DControl === true) {
                const control = ref.current as Control;
                observer2dGuiEnter = control.onPointerEnterObservable.add(over as Gui2dEventType);
                observer2dGuiOut = control.onPointerOutObservable.add(out as Gui2dEventType);
            } else {
                console.warn("Can only apply useHover to non-mesh/2D control currently.", ref.current.__rbs.metadata);
            }

            if (registeredMeshActions.length > 0 || observer2dGuiEnter !== null) {
                return () => {
                    if (ref.current) {
                        if (registeredMeshActions.length > 0) {
                            registeredMeshActions.forEach((action: Nullable<IAction>) => {
                                if (action !== null) {
                                    const mesh = ref.current as Mesh;
                                    mesh.actionManager?.unregisterAction(action);
                                }
                            })
                            registeredMeshActions.splice(0, registeredMeshActions.length)
                        }

                        if (observer2dGuiEnter !== null) {
                            const control = ref.current as Control;
                            control.onPointerEnterObservable.remove(observer2dGuiEnter);
                            control.onPointerOutObservable.remove(observer2dGuiOut);
                            observer2dGuiEnter = null;
                            observer2dGuiOut = null;
                        }
                    }
                }
            }
        }
    }, [ref.current]);
    // todo: if use ref.current as dep,  duplicate register action.

    return [ref, value];
}

/**
 * useClick hook
 * 
 * TODO: support UI
 * @param onClick
 */
export function useClick(onClick: MeshEventType): [MutableRefObject<DecoratedInstance<Mesh | null>>] {
    const ref = useRef<DecoratedInstance<Mesh>>(null) as MutableRefObject<DecoratedInstance<Mesh | null>>;

    useEffect(() => {
        if (ref.current) {
            if (ref.current.__rbs.metadata.isMesh === true) {
                const mesh = ref.current as Mesh;

                if (!mesh.actionManager) {
                    mesh.actionManager = new ActionManager(mesh.getScene());
                }

                mesh.actionManager.registerAction(
                    new ExecuteCodeAction(
                        ActionManager.OnPickTrigger, function (ev: any) {
                            onClick(ev);
                        }
                    )
                );
            } else {
                console.warn('onClick hook only supports referencing Meshes');
            }
        }
    }, [ref]);
    // todo: if use ref.current as dep,  duplicate register action.

    return [ref];
}
