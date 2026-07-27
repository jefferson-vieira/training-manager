import {
  Button,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from 'web';

export function Open() {
  return (
    <Drawer defaultOpen modal={false} showSwipeHandle>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Concluir treino</DrawerTitle>
          <DrawerDescription>
            Você completou 8 de 8 exercícios de Peito e Tríceps.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button>Finalizar</Button>
          <DrawerClose render={<Button variant="ghost">Continuar treinando</Button>} />
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
